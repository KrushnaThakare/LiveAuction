import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
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
  const studioOverlay = Boolean(options.studioOverlay);
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
    if (!applyOverlayClass) {
      document.documentElement.classList.remove('overlay-html');
      return undefined;
    }
    document.documentElement.classList.add('overlay-html');
    return () => document.documentElement.classList.remove('overlay-html');
  }, [applyOverlayClass]);

  useEffect(() => {
    if (!tournamentId) return undefined;

    stoppedRef.current = false;
    debugRef.current = new URLSearchParams(window.location.search).get('debugOverlay') === '1';

    let client;
    let stopped = false;
    let snapshotTimer;
    // Prefer the raw WebSocket endpoint; fall back to SockJS if it never connects
    // (some networks/proxies block raw WebSockets but allow SockJS transports).
    let useSockJS = false;
    let everConnected = false;

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

    const handleMessage = (body) => {
      if (!body) return;
      try {
        const payload = JSON.parse(body);
        if (payload?.broadcastDisabled) {
          setConfig(current => ({ ...(current || {}), overlayEnabled: false }));
          setConnected(false);
          connectedRef.current = false;
          stopped = true;
          clearInterval(snapshotTimer);
          if (client) {
            try {
              client.deactivate();
            } catch { /* already closing */ }
          }
          return;
        }
        mergeSnapshot(payload, useSockJS ? 'websocket-sockjs' : 'websocket');
      } catch (e) {
        setError(e);
      }
    };

    const loadInitial = async () => {
      const configRes = await overlayApi.getConfig(tournamentId, token);
      if (!stopped) {
        setConfig(configRes.data.data);
      }
      if (configRes.data.data?.overlayEnabled === false) {
        return false;
      }
      const snapshotRes = await overlayApi.getSnapshot(tournamentId, token, { includePlayers });
      if (!stopped) {
        mergeSnapshot(snapshotRes.data.data, 'initial-snapshot');
      }
    };

    const startClient = () => {
      if (stopped) return;
      client = new Client({
        webSocketFactory: () => (useSockJS
          ? new SockJS(`${API_BASE}/ws-overlay`)
          : new WebSocket(`${WS_BASE}/ws-overlay-native`)),
        reconnectDelay: 2000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          everConnected = true;
          connectedRef.current = true;
          setConnected(true);
          client.subscribe(
            `/topic/overlay/${tournamentId}/snapshot`,
            (message) => handleMessage(message.body),
            { id: `overlay-${tournamentId}` },
          );
        },
        onWebSocketClose: () => {
          connectedRef.current = false;
          setConnected(false);
          // Raw WebSocket never established: switch to SockJS for the next auto-reconnect.
          if (!everConnected && !useSockJS && !stopped) {
            useSockJS = true;
          }
        },
        onWebSocketError: () => {
          connectedRef.current = false;
          setConnected(false);
        },
        onStompError: (frame) => {
          setError(new Error(frame?.headers?.message || frame?.body || 'Overlay websocket error'));
        },
      });
      client.activate();
    };

    const connect = async () => {
      try {
        const shouldConnect = await loadInitial();
        if (!shouldConnect || stopped) return;
      } catch (e) {
        if (!stopped) setError(e);
        return;
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

      if (stopped) return;
      startClient();
    };

    const bootstrap = async () => {
      setTransportMode('connecting');
      try {
        const configRes = await overlayApi.getConfig(tournamentId, token);
        if (stoppedRef.current) return;
        setConfig(configRes.data.data);
        if (!studioOverlay && configRes.data.data?.overlayEnabled === false) {
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
      clearInterval(snapshotTimer);
      if (client) {
        try {
          client.deactivate();
        } catch { /* already closing */ }
      }
    };
  }, [tournamentId, token, includePlayers, studioOverlay]);

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
