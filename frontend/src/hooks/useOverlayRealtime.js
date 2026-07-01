import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { overlayApi } from '../api/overlay';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
const WS_BASE = API_BASE.replace(/^http/i, 'ws');

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

    let client;
    let stopped = false;
    let snapshotTimer;
    // Prefer the raw WebSocket endpoint; fall back to SockJS if it never connects
    // (some networks/proxies block raw WebSockets but allow SockJS transports).
    let useSockJS = false;
    let everConnected = false;

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
      return true;
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

      clearInterval(snapshotTimer);
      snapshotTimer = setInterval(async () => {
        if (connectedRef.current) return;
        try {
          const snapshotRes = await overlayApi.getSnapshot(tournamentId, token, { includePlayers });
          if (!stopped) mergeSnapshot(snapshotRes.data.data, 'poll-snapshot');
        } catch (e) {
          if (!stopped) setError(e);
        }
      }, 3000);

      if (stopped) return;
      startClient();
    };

    connect();

    return () => {
      stopped = true;
      connectedRef.current = false;
      clearInterval(snapshotTimer);
      if (client) {
        try {
          client.deactivate();
        } catch { /* already closing */ }
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
