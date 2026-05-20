import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { overlayApi } from '../api/overlay';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

export function useOverlayRealtime(tournamentId, token) {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    let sub;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws-overlay`),
      reconnectDelay: 2000,
      onConnect: async () => {
        setConnected(true);
        const res = await overlayApi.getSnapshot(tournamentId, token);
        setData(res.data.data);
        const cfg = await overlayApi.getConfig(tournamentId, token);
        setConfig(cfg.data.data);
        sub = client.subscribe(`/topic/overlay/${tournamentId}/snapshot`, (msg) => setData(JSON.parse(msg.body)));
      },
      onStompError: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });
    client.activate();
    return () => { if (sub) sub.unsubscribe(); client.deactivate(); };
  }, [tournamentId, token]);

  return { data, config, connected };
}
