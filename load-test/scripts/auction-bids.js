/**
 * Keeps a live auction "busy" during viewer load tests.
 * Run in a SECOND terminal while overlay-viewers.js is running.
 *
 * Requires an ACTIVE auction session and at least one team.
 *
 *   k6 run load-test/scripts/auction-bids.js
 *
 * Env: API_URL, TOURNAMENT_ID, ADMIN_USERNAME, ADMIN_PASSWORD, TEAM_ID, BID_INTERVAL_SEC
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { getConfig, loginAdmin, authHeaders } from '../lib/config.js';

const config = getConfig();

export const options = {
  vus: 1,
  duration: __ENV.DURATION || '15m',
};

export function setup() {
  const token = loginAdmin(config);
  return { token };
}

export default function (data) {
  const stateRes = http.get(
    `${config.apiUrl}/tournaments/${config.tournamentId}/auction/state`,
    { headers: authHeaders(data.token), tags: { name: 'auction_state' } },
  );
  check(stateRes, { 'state 200': (r) => r.status === 200 });

  let state;
  try {
    state = JSON.parse(stateRes.body)?.data;
  } catch {
    sleep(config.bidIntervalSec);
    return;
  }

  if (state?.status !== 'ACTIVE') {
    sleep(config.bidIntervalSec);
    return;
  }

  const currentBid = Number(state.currentBid) || 0;
  const nextBid = currentBid + (currentBid >= 10000 ? 2000 : 1000);

  const bidRes = http.post(
    `${config.apiUrl}/tournaments/${config.tournamentId}/auction/bid`,
    JSON.stringify({ teamId: config.teamId, customBidAmount: nextBid }),
    { headers: authHeaders(data.token), tags: { name: 'auction_bid' } },
  );

  check(bidRes, {
    'bid accepted': (r) => r.status === 200,
  });

  sleep(config.bidIntervalSec);
}
