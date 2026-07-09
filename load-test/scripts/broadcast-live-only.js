/**
 * Scenario B — Light broadcast /view load: Live Auction tab only.
 *
 * Each virtual viewer opens /view, connects WebSocket, and stays on the
 * Live Auction tab. A snapshot refresh runs every ~5 seconds (simulates a
 * viewer who never switches tabs but keeps the page open).
 *
 * YOU run the auction manually on the admin UI during this test.
 *
 *   ./load-test/run.sh live
 *   VUS_MAX=150 LIVE_REFRESH_SEC=5 ./load-test/run.sh live
 */
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { getConfig, overlayQuery, parseStages } from '../lib/config.js';
import { wireOverlaySocket } from '../lib/stomp.js';
import {
  fetchOverlayBootstrap,
  defaultGradualStages,
} from '../lib/broadcastView.js';

const overlayMessages = new Counter('overlay_ws_messages');
const liveRefreshes = new Counter('broadcast_live_refreshes');
const wsConnectMs = new Trend('overlay_ws_connect_ms', true);

const config = getConfig();
const query = overlayQuery(config);
const maxVus = Number(__ENV.VUS_MAX || '100');
const refreshSec = Number(__ENV.LIVE_REFRESH_SEC || '5');

export const options = {
  stages: parseStages(__ENV.STAGES, defaultGradualStages(maxVus)),
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000', 'p(99)<2500'],
    checks: ['rate>0.98'],
  },
};

function scheduleLiveRefresh(socket) {
  socket.setTimeout(() => {
    const snapRes = http.get(`${config.apiUrl}/overlay/${config.tournamentId}/snapshot${query}`, {
      tags: { name: 'live_snapshot_refresh' },
    });
    check(snapRes, { 'live snapshot 200': (r) => r.status === 200 });
    liveRefreshes.add(1);
    scheduleLiveRefresh(socket);
  }, refreshSec * 1000);
}

export default function () {
  fetchOverlayBootstrap(config, query);
  const started = Date.now();

  const res = ws.connect(config.wsUrl, {}, (socket) => {
    wireOverlaySocket(socket, config.tournamentId, {
      onConnected: () => wsConnectMs.add(Date.now() - started),
      onMessage: () => overlayMessages.add(1),
    });

    scheduleLiveRefresh(socket);
    socket.setTimeout(() => socket.close(), config.viewerDurationSec * 1000);
  });

  check(res, { 'websocket 101': (r) => r && r.status === 101 });
  sleep(1);
}
