import { useEffect, useRef, useState } from 'react';
import { overlayApi } from '../api/overlay';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
const WS_BASE = API_BASE.replace(/^http/i, 'ws');

const POLL_MS_DISCONNECTED = 1500;
const SUMMARY_REFRESH_MS = 12000;
const SQUAD_REFRESH_MS = 20000;
const WS_STALE_MS = 15000;

function getBidRevision(auction) {
  const revision = Number(auction?.bidRevision);
  return Number.isFinite(revision) ? revision : null;
}

function isOlderAuctionUpdate(currentAuction, incomingAuction) {
  if (!currentAuction || !incomingAuction) return false;
  if (String(currentAuction.sessionId || '') !== String(incomingAuction.sessionId || '')) return false;
  const currentRevision = getBidRevision(currentAuction);
  const incomingRevision = getBidRevision(incomingAuction);
  return currentRevision != null && incomingRevision != null && incomingRevision < currentRevision;
}

function buildFrame(command, headers = {}, body = '') {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\n');
  return `${command}\n${headerLines}\n\n${body}\0`;
}

function parseStompFrames(raw) {
  return String(raw)
    .split('\0')
    .map(frame => frame.trim())
    .filter(Boolean)
    .map(frame => {
      const [head, ...bodyParts] = frame.split('\n\n');
      const [command, ...headerLines] = head.split('\n');
      const headers = Object.fromEntries(headerLines.map(line => {
        const idx = line.indexOf(':');
        return idx === -1 ? [line, ''] : [line.slice(0, idx), line.slice(idx + 1)];
      }));
      return { command, headers, body: bodyParts.join('\n\n') };
    });
}

function mergePlayerLists(existingPlayers, incomingPlayers) {
  const existing = Array.isArray(existingPlayers) ? existingPlayers : [];
  const incoming = Array.isArray(incomingPlayers) ? incomingPlayers : [];
  if (!incoming.length) return existing;
  if (!existing.length) return incoming;

  const byId = new Map(existing.map((player) => [String(player.id), player]));
  for (const player of incoming) {
    const key = String(player.id);
    byId.set(key, byId.has(key) ? { ...byId.get(key), ...player } : player);
  }
  return Array.from(byId.values());
}

function mergeTeams(currentTeams = [], incomingTeams = []) {
  if (!Array.isArray(incomingTeams) || incomingTeams.length === 0) {
    return currentTeams;
  }
  const currentById = new Map((currentTeams || []).map(team => [String(team.id), team]));
  return incomingTeams.map(team => {
    const existing = currentById.get(String(team.id));
    if (!existing) return team;
    const incomingPlayers = Array.isArray(team.players) ? team.players : null;
    const mergedPlayers = mergePlayerLists(existing.players, incomingPlayers);
    const playerCount = Math.max(
      Number(team.playerCount) || 0,
      Number(existing.playerCount) || 0,
      mergedPlayers.length,
    );
    return {
      ...existing,
      ...team,
      logoUrl: team.logoUrl || existing.logoUrl,
      name: team.name || existing.name,
      budget: team.budget ?? existing.budget,
      remainingBudget: team.remainingBudget ?? existing.remainingBudget,
      playerCount,
      players: mergedPlayers.length ? mergedPlayers : existing.players,
    };
  });
}

export function useOverlayRealtime(tournamentId, token, options = {}) {
  const includePlayers = Boolean(options.includePlayers);
  const applyOverlayClass = options.applyOverlayClass !== false;
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState('connecting');
  const [error, setError] = useState(null);
  const freshLocalAuctionRef = useRef(null);
  const connectedRef = useRef(false);
  const debugRef = useRef(false);
  const stoppedRef = useRef(false);
  const wsRef = useRef(null);
  const snapshotInFlightRef = useRef(false);
  const lastWsMessageAtRef = useRef(0);
  const timersRef = useRef({
    poll: null,
    summary: null,
    squad: null,
    reconnect: null,
    staleCheck: null,
  });

  useEffect(() => {
    if (!applyOverlayClass) return undefined;
    document.documentElement.classList.add('overlay-html');
    return () => document.documentElement.classList.remove('overlay-html');
  }, [applyOverlayClass]);

  useEffect(() => {
    if (!tournamentId) return undefined;

    stoppedRef.current = false;
    debugRef.current = new URLSearchParams(window.location.search).get('debugOverlay') === '1';

    const clearTimers = () => {
      const timers = timersRef.current;
      if (timers.poll) clearInterval(timers.poll);
      if (timers.summary) clearInterval(timers.summary);
      if (timers.squad) clearInterval(timers.squad);
      if (timers.reconnect) clearTimeout(timers.reconnect);
      if (timers.staleCheck) clearInterval(timers.staleCheck);
      timersRef.current = {
        poll: null,
        summary: null,
        squad: null,
        reconnect: null,
        staleCheck: null,
      };
    };

    const closeWebSocket = () => {
      const socket = wsRef.current;
      wsRef.current = null;
      if (!socket) return;
      try {
        if (socket.readyState <= 1) {
          socket.send(buildFrame('DISCONNECT', { receipt: 'close' }));
        }
      } catch { /* socket may already be closing */ }
      try {
        socket.close();
      } catch { /* ignore */ }
    };

    const logUpdate = (source, auction, status = 'accept') => {
      const line = `[overlay-sync] ${status} ${source}`;
      if (debugRef.current) {
        console.log(line, {
          sessionId: auction?.sessionId,
          bidRevision: auction?.bidRevision,
          currentBid: auction?.currentBid,
          status: auction?.status,
          at: new Date().toISOString(),
        });
      }
    };

    const logTransport = (mode, detail = '') => {
      if (debugRef.current) {
        console.log(`[overlay-sync] transport=${mode}${detail ? ` ${detail}` : ''}`);
      }
    };

    const setTransportMode = (mode) => {
      setTransport(mode);
      connectedRef.current = mode === 'websocket';
      setConnected(mode === 'websocket');
    };

    const mergeSnapshot = (snapshot, source = 'snapshot') => {
      setData(current => {
        const fresh = freshLocalAuctionRef.current;
        const incomingAuction = snapshot?.auction;
        const currentAuction = current?.auction;
        if (isOlderAuctionUpdate(currentAuction, incomingAuction)) {
          logUpdate(source, incomingAuction, 'reject-stale');
          return {
            ...(current || {}),
            ...snapshot,
            auction: currentAuction,
            teams: mergeTeams(current?.teams, snapshot.teams),
          };
        }
        if (
          fresh &&
          Date.now() < fresh.until &&
          incomingAuction?.status === 'ACTIVE' &&
          fresh.auction?.status === 'ACTIVE' &&
          incomingAuction?.sessionId === fresh.auction?.sessionId &&
          Number(incomingAuction?.currentBid) !== Number(fresh.auction?.currentBid)
        ) {
          logUpdate(source, incomingAuction, 'reject-fresh-local');
          const mergedTeams = mergeTeams(current?.teams, snapshot.teams);
          return {
            ...(current || {}),
            ...snapshot,
            auction: fresh.auction,
            teams: mergedTeams.length ? mergedTeams : (current?.teams || []),
          };
        }
        if (fresh && Number(incomingAuction?.currentBid) === Number(fresh.auction?.currentBid)) {
          freshLocalAuctionRef.current = null;
        }
        logUpdate(source, incomingAuction);
        if (!snapshot) return current;
        const mergedTeams = mergeTeams(current?.teams, snapshot.teams);
        return {
          ...current,
          ...snapshot,
          auction: incomingAuction ?? current?.auction,
          teams: mergedTeams.length ? mergedTeams : (current?.teams || []),
        };
      });
    };

    const fetchSnapshot = async (source, withPlayers = false) => {
      if (snapshotInFlightRef.current || stoppedRef.current) return;
      snapshotInFlightRef.current = true;
      try {
        const snapshotRes = await overlayApi.getSnapshot(tournamentId, token, { includePlayers: withPlayers });
        if (!stoppedRef.current) {
          mergeSnapshot(snapshotRes.data.data, source);
        }
      } catch (e) {
        if (!stoppedRef.current) setError(e);
      } finally {
        snapshotInFlightRef.current = false;
      }
    };

    const startPolling = () => {
      clearTimers();

      timersRef.current.poll = setInterval(() => {
        if (stoppedRef.current || connectedRef.current) return;
        fetchSnapshot('poll-snapshot', false);
      }, POLL_MS_DISCONNECTED);

      timersRef.current.summary = setInterval(() => {
        if (stoppedRef.current) return;
        if (connectedRef.current) {
          fetchSnapshot('summary-refresh', false);
        }
      }, SUMMARY_REFRESH_MS);

      if (includePlayers) {
        timersRef.current.squad = setInterval(() => {
          if (stoppedRef.current) return;
          fetchSnapshot('squad-refresh', true);
        }, SQUAD_REFRESH_MS);
      }

      timersRef.current.staleCheck = setInterval(() => {
        if (stoppedRef.current || !connectedRef.current) return;
        if (lastWsMessageAtRef.current && Date.now() - lastWsMessageAtRef.current > WS_STALE_MS) {
          logTransport('polling', '(websocket stale — no messages)');
          setTransportMode('polling');
        }
      }, 5000);
    };

    const connectWebSocket = () => {
      if (stoppedRef.current) return;
      closeWebSocket();

      const wsUrl = `${WS_BASE}/ws-overlay-native`;
      logTransport('connecting', wsUrl);
      setTransportMode('connecting');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(buildFrame('CONNECT', {
          'accept-version': '1.2',
          'heart-beat': '10000,10000',
        }));
      };

      ws.onmessage = (event) => {
        lastWsMessageAtRef.current = Date.now();
        for (const frame of parseStompFrames(event.data)) {
          if (frame.command === 'CONNECTED') {
            setTransportMode('websocket');
            logTransport('websocket', 'connected');
            ws.send(buildFrame('SUBSCRIBE', {
              id: `overlay-${tournamentId}`,
              destination: `/topic/overlay/${tournamentId}/snapshot`,
            }));
          }
          if (frame.command === 'MESSAGE' && frame.body) {
            try {
              const payload = JSON.parse(frame.body);
              if (payload?.broadcastDisabled) {
                setConfig(current => ({ ...(current || {}), overlayEnabled: false }));
                setTransportMode('offline');
                stoppedRef.current = true;
                clearTimers();
                closeWebSocket();
                continue;
              }
              mergeSnapshot(payload, 'websocket');
            } catch (e) {
              setError(e);
            }
          }
          if (frame.command === 'ERROR') {
            setError(new Error(frame.body || 'Overlay websocket error'));
            logTransport('polling', '(websocket error frame)');
            setTransportMode('polling');
          }
        }
      };

      ws.onclose = () => {
        if (stoppedRef.current) return;
        logTransport('polling', '(websocket closed — using HTTP poll)');
        setTransportMode('polling');
        wsRef.current = null;
        timersRef.current.reconnect = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = () => {
        logTransport('polling', '(websocket error)');
        setTransportMode('polling');
      };
    };

    const bootstrap = async () => {
      setTransportMode('connecting');
      try {
        const configRes = await overlayApi.getConfig(tournamentId, token);
        if (stoppedRef.current) return;
        setConfig(configRes.data.data);
        if (configRes.data.data?.overlayEnabled === false) {
          setTransportMode('offline');
          return;
        }
        await fetchSnapshot('initial-snapshot', includePlayers);
        if (stoppedRef.current) return;
        startPolling();
        connectWebSocket();
      } catch (e) {
        if (!stoppedRef.current) {
          setError(e);
          setTransportMode('polling');
          startPolling();
        }
      }
    };

    bootstrap();

    return () => {
      stoppedRef.current = true;
      connectedRef.current = false;
      clearTimers();
      closeWebSocket();
    };
  }, [tournamentId, token, includePlayers]);

  useEffect(() => {
    if (!tournamentId) return undefined;

    const applyAuctionUpdate = (payload) => {
      if (String(payload?.tournamentId) !== String(tournamentId) || !payload?.auction) return;
      if (payload.auction.status === 'ACTIVE') {
        freshLocalAuctionRef.current = {
          auction: payload.auction,
          until: Date.now() + 3000,
        };
      } else {
        freshLocalAuctionRef.current = null;
      }
      setData(current => ({
        ...(current || {}),
        auction: payload.auction,
        teams: mergeTeams(current?.teams, payload.teams),
      }));
      if (debugRef.current) {
        console.log('[overlay-sync] accept local-broadcast', {
          sessionId: payload.auction?.sessionId,
          bidRevision: payload.auction?.bidRevision,
          currentBid: payload.auction?.currentBid,
          status: payload.auction?.status,
        });
      }
    };

    const onStorage = (event) => {
      if (event.key !== 'auction-overlay-state-updated' || !event.newValue) return;
      try {
        applyAuctionUpdate(JSON.parse(event.newValue));
      } catch (e) {
        setError(e);
      }
    };
    window.addEventListener('storage', onStorage);

    let channel;
    try {
      channel = new BroadcastChannel('auction-overlay-state');
      channel.onmessage = (event) => applyAuctionUpdate(event.data);
    } catch { /* BroadcastChannel is optional. */ }

    return () => {
      window.removeEventListener('storage', onStorage);
      channel?.close();
    };
  }, [tournamentId]);

  return { data, config, connected, transport, error };
}
