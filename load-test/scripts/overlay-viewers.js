/**
 * Simulates many people opening the public broadcaster /view link.
 * Each VU: config + snapshot HTTP, then stays on WebSocket like a real viewer.
 *
 *   k6 run load-test/scripts/overlay-viewers.js
 *
 * Env:
 *   API_URL, TOURNAMENT_ID, OVERLAY_TOKEN (optional)
 *   VUS_MAX=200 STAGES="1m:50,3m:200,5m:200,1m:0" VIEWER_DURATION_SEC=600
 */
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { getConfig, overlayQuery, parseStages, defaultViewerStages } from '../lib/config.js';
import { wireOverlaySocket } from '../lib/stomp.js';

const overlayMessages = new Counter('overlay_ws_messages');
const wsConnectMs = new Trend('overlay_ws_connect_ms', true);

const config = getConfig();
const query = overlayQuery(config);
const maxVus = Number(__ENV.VUS_MAX || '100');

export const options = {
  stages: parseStages(__ENV.STAGES, defaultViewerStages(maxVus)),
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000', 'p(99)<2500'],
    checks: ['rate>0.98'],
  },
};

export default function () {
  const configRes = http.get(`${config.apiUrl}/overlay/${config.tournamentId}/config${query}`, {
    tags: { name: 'overlay_config' },
  });
  check(configRes, { 'config 200': (r) => r.status === 200 });

  const snapRes = http.get(`${config.apiUrl}/overlay/${config.tournamentId}/snapshot${query}`, {
    tags: { name: 'overlay_snapshot' },
  });
  check(snapRes, { 'snapshot 200': (r) => r.status === 200 });

  const started = Date.now();
  const res = ws.connect(config.wsUrl, {}, (socket) => {
    wireOverlaySocket(socket, config.tournamentId, {
      onConnected: () => wsConnectMs.add(Date.now() - started),
      onMessage: () => overlayMessages.add(1),
    });
    socket.setTimeout(() => socket.close(), config.viewerDurationSec * 1000);
  });

  check(res, { 'websocket 101': (r) => r && r.status === 101 });
  sleep(1);
}
