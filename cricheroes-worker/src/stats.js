const PROFILE_PATH_RE = /^\/player-profile\/\d+/i;

export function normalizeProfileUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw Object.assign(new Error('profileUrl is required'), { statusCode: 400 });
  }
  let clean = rawUrl.trim();
  if (clean.startsWith('//')) clean = `https:${clean}`;
  if (clean.startsWith('/player-profile/')) clean = `https://cricheroes.com${clean}`;
  if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;

  const url = new URL(clean);
  const host = url.hostname.toLowerCase();
  if (!host.endsWith('cricheroes.com') || !PROFILE_PATH_RE.test(url.pathname)) {
    throw Object.assign(new Error('Only CricHeroes player profile URLs are supported'), { statusCode: 400 });
  }
  url.protocol = 'https:';
  return url.toString();
}

export function candidateUrls(profileUrl) {
  const clean = normalizeProfileUrl(profileUrl).replace(/\/+$/, '');
  const withoutKnownTab = clean.replace(/\/(stats|matches|awards|badges|teams|photos|connections|profile)$/i, '');
  return [
    `${withoutKnownTab}/stats`,
    `${withoutKnownTab}/profile`,
    withoutKnownTab,
  ];
}

export function parseStatsFromText(rawText) {
  const text = String(rawText || '').replace(/\s+/g, ' ').trim();
  return {
    statsMatches: parseInteger(text, ['matches', 'match']),
    statsRuns: parseInteger(text, ['runs', 'run']),
    statsWickets: parseInteger(text, ['wickets', 'wicket']),
    statsStrikeRate: parseDecimal(text, ['strike rate', 'sr', 's/r']),
    statsEconomy: parseDecimal(text, ['economy', 'econ']),
    statsAverage: parseDecimal(text, ['average', 'avg']),
  };
}

export function hasAnyStat(stats) {
  return Object.values(stats || {}).some(value => value !== null && value !== undefined);
}

export function looksUnauthenticated(pageUrl, text) {
  const lowerUrl = String(pageUrl || '').toLowerCase();
  const lowerText = String(text || '').toLowerCase();
  return lowerUrl.includes('/login') ||
    lowerText.includes('enter mobile') ||
    lowerText.includes('verify otp') ||
    lowerText.includes('login with') ||
    lowerText.includes('sign in');
}

function parseInteger(text, labels) {
  const value = parseDecimal(text, labels);
  return value == null ? null : Math.trunc(value);
}

function parseDecimal(text, labels) {
  for (const label of labels) {
    const escaped = label
      .split(/\s+/)
      .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+');
    const patterns = [
      new RegExp(`\\b${escaped}\\b\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)`, 'i'),
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*\\b${escaped}\\b`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
  }
  return null;
}
