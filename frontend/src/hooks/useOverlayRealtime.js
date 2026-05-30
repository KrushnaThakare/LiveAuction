import { useEffect, useState } from 'react';
import { overlayApi } from '../api/overlay';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');
const WS_BASE = API_BASE.replace(/^http/i, 'ws');

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

export function useOverlayRealtime(tournamentId, token) {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.classList.add('overlay-html');
    return () => document.documentElement.classList.remove('overlay-html');
  }, []);

  useEffect(() => {
    if (!tournamentId) return;

    let ws;
    let stopped = false;
    let reconnectTimer;

    const loadInitial = async () => {
      const [snapshotRes, configRes] = await Promise.all([
        overlayApi.getSnapshot(tournamentId, token),
        overlayApi.getConfig(tournamentId, token),
      ]);
      if (!stopped) {
        setData(snapshotRes.data.data);
        setConfig(configRes.data.data);
      }
    };

    const connect = async () => {
      try {
        await loadInitial();
      } catch (e) {
        if (!stopped) setError(e);
      }

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
            setConnected(true);
            ws.send(buildFrame('SUBSCRIBE', {
              id: `overlay-${tournamentId}`,
              destination: `/topic/overlay/${tournamentId}/snapshot`,
            }));
          }
          if (frame.command === 'MESSAGE' && frame.body) {
            try {
              setData(JSON.parse(frame.body));
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
        setConnected(false);
        if (!stopped) reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        setConnected(false);
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      if (ws && ws.readyState <= 1) {
        try { ws.send(buildFrame('DISCONNECT', { receipt: 'close' })); } catch {}
        ws.close();
      }
    };
  }, [tournamentId, token]);

  return { data, config, connected, error };
}
