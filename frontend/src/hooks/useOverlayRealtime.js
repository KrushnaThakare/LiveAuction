import { useEffect, useRef, useState } from 'react';
import { overlayApi } from '../api/overlay';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
const WS_BASE = API_BASE.replace(/^http/i, 'ws');

const OVERLAY_POLL_MS = 8000;
const OVERLAY_POLL_JITTER_MS = 2000;

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

function mergeTeams(currentTeams = [], incomingTeams = []) {
  if (!Array.isArray(incomingTeams)) return currentTeams;
  const currentById = new Map(currentTeams.map(team => [String(team.id), team]));
  return incomingTeams.map(team => {
    const existing = currentById.get(String(team.id));
    if (!existing) return team;
    return {
      ...existing,
      ...team,
      players: Array.isArray(team.players) ? team.players : existing.players,
    };
  });
}

export function useOverlayRealtime(tournamentId, token, options = {}) {
  const includePlayers = Boolean(options.includePlayers);
  const applyOverlayClass = options.applyOverlayClass !== false;
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const freshLocalAuctionRef = useRef(null);
  const connectedRef = useRef(false);
  const debugRef = useRef(false);

  useEffect(() => {
    if (!applyOverlayClass) return undefined;
    document.documentElement.classList.add('overlay-html');
    return () => document.documentElement.classList.remove('overlay-html');
  }, [applyOverlayClass]);

  useEffect(() => {
    if (!tournamentId) return;
    debugRef.current = new URLSearchParams(window.location.search).get('debugOverlay') === '1';

    let ws;
    let stopped = false;
    let reconnectTimer;
    let snapshotTimer;

    const logUpdate = (source, auction, status = 'accept') => {
      if (!debugRef.current) return;
      console.debug('[overlay-sync]', status, source, {
        sessionId: auction?.sessionId,
        bidRevision: auction?.bidRevision,
        currentBid: auction?.currentBid,
        status: auction?.status,
        at: new Date().toISOString(),
      });
    };

    const mergeSnapshot = (snapshot, source = 'snapshot') => {
      setData(current => {
        const fresh = freshLocalAuctionRef.current;
        const incomingAuction = snapshot?.auction;
        const currentAuction = current?.auction;
        if (isOlderAuctionUpdate(currentAuction, incomingAuction)) {
          logUpdate(source, incomingAuction, 'reject-stale');
          return snapshot ? { ...snapshot, auction: currentAuction, teams: mergeTeams(current?.teams, snapshot.teams) } : current;
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
          return {
            ...snapshot,
            auction: fresh.auction,
            teams: mergeTeams(current?.teams, snapshot.teams),
          };
        }
        if (fresh && Number(incomingAuction?.currentBid) === Number(fresh.auction?.currentBid)) {
          freshLocalAuctionRef.current = null;
        }
        logUpdate(source, incomingAuction);
        if (!snapshot) return current;
        return {
          ...snapshot,
          teams: mergeTeams(current?.teams, snapshot.teams),
        };
      });
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
      return true;
    };

    const connect = async () => {
      try {
        const shouldConnect = await loadInitial();
        if (!shouldConnect || stopped) return;
      } catch (e) {
        if (!stopped) setError(e);
        return;
      }

      clearInterval(snapshotTimer);
      const pollDelay = OVERLAY_POLL_MS + Math.floor(Math.random() * OVERLAY_POLL_JITTER_MS);
      snapshotTimer = setInterval(async () => {
        if (connectedRef.current) return;
        try {
          const snapshotRes = await overlayApi.getSnapshot(tournamentId, token, { includePlayers });
          if (!stopped) mergeSnapshot(snapshotRes.data.data, 'poll-snapshot');
        } catch (e) {
          if (!stopped) setError(e);
        }
      }, pollDelay);

      if (stopped) return;
      ws = new WebSocket(`${WS_BASE}/ws-overlay-native`);

      ws.onopen = () => {
        ws.send(buildFrame('CONNECT', {
          'accept-version': '1.2',
          'heart-beat': '10000,10000',
        }));
      };

      ws.onmessage = (event) => {
        for (const frame of parseStompFrames(event.data)) {
          if (frame.command === 'CONNECTED') {
            connectedRef.current = true;
            setConnected(true);
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
                setConnected(false);
                connectedRef.current = false;
                stopped = true;
                clearInterval(snapshotTimer);
                clearTimeout(reconnectTimer);
                try {
                  ws.close();
                } catch { /* already closing */ }
                continue;
              }
              mergeSnapshot(payload, 'websocket');
            } catch (e) {
              setError(e);
            }
          }
          if (frame.command === 'ERROR') {
            setError(new Error(frame.body || 'Overlay websocket error'));
          }
        }
      };

      ws.onclose = () => {
        connectedRef.current = false;
        setConnected(false);
        if (!stopped) reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        connectedRef.current = false;
        setConnected(false);
      };
    };

    connect();

    return () => {
      stopped = true;
      connectedRef.current = false;
      clearTimeout(reconnectTimer);
      clearInterval(snapshotTimer);
      if (ws && ws.readyState <= 1) {
        try {
          ws.send(buildFrame('DISCONNECT', { receipt: 'close' }));
        } catch {
          // Socket may already be closing; close() below is enough.
        }
        ws.close();
      }
    };
  }, [tournamentId, token, includePlayers]);

  useEffect(() => {
    if (!tournamentId) return;

    const applyAuctionUpdate = (payload) => {
      if (String(payload?.tournamentId) !== String(tournamentId) || !payload?.auction) return;
      freshLocalAuctionRef.current = {
        auction: payload.auction,
        until: Date.now() + 3000,
      };
      setData(current => ({
        ...(current || {}),
        auction: payload.auction,
      }));
      if (debugRef.current) {
        console.debug('[overlay-sync]', 'accept', payload.type || 'local-broadcast', {
          sessionId: payload.auction?.sessionId,
          bidRevision: payload.auction?.bidRevision,
          currentBid: payload.auction?.currentBid,
          status: payload.auction?.status,
          at: new Date().toISOString(),
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

  return { data, config, connected, error };
}
