import http from 'k6/http';

/** Shared config for k6 overlay / auction load tests */

export function getConfig() {
  const apiUrl = (__ENV.API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
  const httpRoot = apiUrl.replace(/\/api\/?$/, '');
  const wsUrl = `${httpRoot.replace(/^https/, 'wss').replace(/^http/, 'ws')}/ws-overlay-native`;

  return {
    apiUrl,
    wsUrl,
    tournamentId: String(__ENV.TOURNAMENT_ID || '1'),
    overlayToken: __ENV.OVERLAY_TOKEN || '',
    adminUsername: __ENV.ADMIN_USERNAME || 'admin',
    adminPassword: __ENV.ADMIN_PASSWORD || 'admin123',
    teamId: Number(__ENV.TEAM_ID || '1'),
    bidIntervalSec: Number(__ENV.BID_INTERVAL_SEC || '4'),
    viewerDurationSec: Number(__ENV.VIEWER_DURATION_SEC || '600'),
  };
}

export function overlayQuery(config, extra = {}) {
  const params = { ...extra };
  if (config.overlayToken) params.token = config.overlayToken;
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export function parseStages(raw, fallback) {
  if (!raw) return fallback;
  return raw.split(',').map((part) => {
    const [duration, target] = part.trim().split(':');
    return { duration: duration.trim(), target: Number(target.trim()) };
  });
}

export function defaultViewerStages(maxVus = 100) {
  const half = Math.max(10, Math.floor(maxVus / 2));
  return [
    { duration: '1m', target: half },
    { duration: '2m', target: maxVus },
    { duration: '5m', target: maxVus },
    { duration: '1m', target: 0 },
  ];
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function loginAdmin(config) {
  const res = http.post(
    `${config.apiUrl}/auth/login`,
    JSON.stringify({ username: config.adminUsername, password: config.adminPassword }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_login' } },
  );
  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${res.body}`);
  }
  const body = JSON.parse(res.body);
  const token = body?.data?.token;
  if (!token) throw new Error('Login response missing data.token');
  return token;
}
