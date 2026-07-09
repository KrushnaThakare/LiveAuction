/** Helpers mirroring PublicViewPage (/view) HTTP behaviour */

import http from 'k6/http';
import { check } from 'k6';

export function parseApiData(res) {
  try {
    return JSON.parse(res.body)?.data;
  } catch {
    return null;
  }
}

export function parseOverlayConfig(configRes) {
  const data = parseApiData(configRes);
  if (!data) return null;
  return {
    overlayEnabled: data.overlayEnabled !== false,
    publicViewShowTeams: data.publicViewShowTeams !== false,
    publicViewShowSold: data.publicViewShowSold !== false,
    publicViewShowUnsold: data.publicViewShowUnsold !== false,
  };
}

/** Same tab order as PublicViewPage */
export function visibleTabs(viewConfig) {
  const tabs = ['auction'];
  if (!viewConfig) return tabs;
  if (viewConfig.publicViewShowTeams !== false) tabs.push('teams');
  if (viewConfig.publicViewShowSold !== false) tabs.push('sold');
  if (viewConfig.publicViewShowUnsold !== false) tabs.push('unsold');
  return tabs;
}

export function fetchOverlayBootstrap(config, query) {
  const configRes = http.get(`${config.apiUrl}/overlay/${config.tournamentId}/config${query}`, {
    tags: { name: 'overlay_config' },
  });
  check(configRes, { 'config 200': (r) => r.status === 200 });

  const snapRes = http.get(`${config.apiUrl}/overlay/${config.tournamentId}/snapshot${query}`, {
    tags: { name: 'overlay_snapshot' },
  });
  check(snapRes, { 'snapshot 200': (r) => r.status === 200 });

  return { configRes, snapRes, viewConfig: parseOverlayConfig(configRes) };
}

export function fetchBroadcastTab(config, tab) {
  const tid = config.tournamentId;
  if (tab === 'teams') {
    const res = http.get(`${config.apiUrl}/tournaments/${tid}/teams`, {
      tags: { name: 'view_tab_teams' },
    });
    check(res, { 'teams 200': (r) => r.status === 200 });
    return res;
  }
  if (tab === 'sold') {
    const res = http.get(`${config.apiUrl}/tournaments/${tid}/players?status=SOLD`, {
      tags: { name: 'view_tab_sold' },
    });
    check(res, { 'sold 200': (r) => r.status === 200 });
    return res;
  }
  if (tab === 'unsold') {
    const res = http.get(`${config.apiUrl}/tournaments/${tid}/players?status=UNSOLD`, {
      tags: { name: 'view_tab_unsold' },
    });
    check(res, { 'unsold 200': (r) => r.status === 200 });
    return res;
  }
  return null;
}

export function randomDelaySec(minSec, maxSec) {
  const min = Number(minSec);
  const max = Number(maxSec);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return min;
  return min + Math.random() * (max - min);
}

export function defaultGradualStages(maxVus = 50) {
  const step1 = Math.max(5, Math.floor(maxVus * 0.2));
  const step2 = Math.max(step1, Math.floor(maxVus * 0.6));
  return [
    { duration: '1m', target: step1 },
    { duration: '2m', target: step2 },
    { duration: '3m', target: maxVus },
    { duration: '5m', target: maxVus },
    { duration: '2m', target: 0 },
  ];
}
