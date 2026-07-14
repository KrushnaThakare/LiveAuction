/**
 * Worst-case stress test: WebSocket disabled — every VU polls /snapshot every 3s
 * (matches useOverlayRealtime HTTP fallback interval).
 *
 * Use a LOW user count first (20–50). This hammers the DB connection pool.
 *
 *   k6 run load-test/scripts/overlay-poll-only.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { getConfig, overlayQuery, parseStages } from '../lib/config.js';

const config = getConfig();
const query = overlayQuery(config);
const pollSec = Number(__ENV.POLL_INTERVAL_SEC || '3');
const maxVus = Number(__ENV.VUS_MAX || '30');

export const options = {
  stages: parseStages(__ENV.STAGES, [
    { duration: '1m', target: Math.min(20, maxVus) },
    { duration: '3m', target: maxVus },
    { duration: '1m', target: 0 },
  ]),
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  const snapRes = http.get(`${config.apiUrl}/overlay/${config.tournamentId}/snapshot${query}`, {
    tags: { name: 'overlay_snapshot_poll' },
  });
  check(snapRes, { 'snapshot 200': (r) => r.status === 200 });
  sleep(pollSec);
}
