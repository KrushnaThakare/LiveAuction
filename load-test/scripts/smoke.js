/**
 * Quick smoke test — 5 virtual viewers + overlay APIs + WebSocket.
 *
 *   k6 run load-test/scripts/smoke.js
 */
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { getConfig, overlayQuery } from '../lib/config.js';
import { wireOverlaySocket } from '../lib/stomp.js';

export const options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.95'],
  },
};

const config = getConfig();
const query = overlayQuery(config);

export default function () {
  const configRes = http.get(`${config.apiUrl}/overlay/${config.tournamentId}/config${query}`, {
    tags: { name: 'overlay_config' },
  });
  check(configRes, { 'config 200': (r) => r.status === 200 });

  const snapRes = http.get(`${config.apiUrl}/overlay/${config.tournamentId}/snapshot${query}`, {
    tags: { name: 'overlay_snapshot' },
  });
  check(snapRes, { 'snapshot 200': (r) => r.status === 200 });

  const res = ws.connect(config.wsUrl, {}, (socket) => {
    wireOverlaySocket(socket, config.tournamentId, {});
    socket.setTimeout(() => socket.close(), 90000);
  });

  check(res, { 'websocket upgrade': (r) => r && r.status === 101 });
  sleep(5);
}
