/**
 * Scenario A — Heavy broadcast /view load with frequent tab switching.
 *
 * Simulates viewers on phones/laptops opening the public broadcast link and
 * switching between Live Auction, Teams, Sold, and Unsold every 2–3 seconds
 * (configurable), while staying connected on the overlay WebSocket.
 *
 * YOU run the auction manually on the admin UI during this test.
 *
 *   ./load-test/run.sh tabs
 *   VUS_MAX=80 TAB_SWITCH_MIN_SEC=2 TAB_SWITCH_MAX_SEC=3 ./load-test/run.sh tabs
 */
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { getConfig, overlayQuery, parseStages } from '../lib/config.js';
import { wireOverlaySocket } from '../lib/stomp.js';
import {
  fetchOverlayBootstrap,
  fetchBroadcastTab,
  visibleTabs,
  randomDelaySec,
  defaultGradualStages,
} from '../lib/broadcastView.js';

const overlayMessages = new Counter('overlay_ws_messages');
const tabSwitches = new Counter('broadcast_tab_switches');
const wsConnectMs = new Trend('overlay_ws_connect_ms', true);

const config = getConfig();
const query = overlayQuery(config);
const maxVus = Number(__ENV.VUS_MAX || '50');
const tabMin = Number(__ENV.TAB_SWITCH_MIN_SEC || '2');
const tabMax = Number(__ENV.TAB_SWITCH_MAX_SEC || '3');

export const options = {
  stages: parseStages(__ENV.STAGES, defaultGradualStages(maxVus)),
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    checks: ['rate>0.97'],
  },
};

function scheduleTabRotation(socket, tabs, tabIndexRef) {
  const delaySec = randomDelaySec(tabMin, tabMax);
  socket.setTimeout(() => {
    const tab = tabs[tabIndexRef.i % tabs.length];
    tabIndexRef.i += 1;
    tabSwitches.add(1);
    if (tab !== 'auction') {
      fetchBroadcastTab(config, tab);
    }
    scheduleTabRotation(socket, tabs, tabIndexRef);
  }, delaySec * 1000);
}

export default function () {
  const { viewConfig } = fetchOverlayBootstrap(config, query);
  const tabs = visibleTabs(viewConfig);
  const tabIndexRef = { i: 0 };
  const started = Date.now();

  const res = ws.connect(config.wsUrl, {}, (socket) => {
    wireOverlaySocket(socket, config.tournamentId, {
      onConnected: () => wsConnectMs.add(Date.now() - started),
      onMessage: () => overlayMessages.add(1),
    });

    scheduleTabRotation(socket, tabs, tabIndexRef);
    socket.setTimeout(() => socket.close(), config.viewerDurationSec * 1000);
  });

  check(res, { 'websocket 101': (r) => r && r.status === 101 });
  sleep(1);
}
