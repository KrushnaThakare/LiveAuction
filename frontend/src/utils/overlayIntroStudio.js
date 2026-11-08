import { parsePlayerExtraEntries, normalizeHeader } from './playerDisplayExtras';
import { statValue } from './playerStats';

export const INTRO_TEMPLATES = [
  { id: 'cinematic-reveal', label: 'Cinematic Player Reveal', description: 'Full-stage spotlight, gold accents, staggered reveal.' },
  { id: 'sports-profile', label: 'Professional Sports Profile', description: 'Photo left, structured TV panels right.' },
  { id: 'dynamic-card', label: 'Dynamic 3D Player Card', description: 'Angular card, cyan highlights, 3D entry.' },
];

export const INTRO_DURATION_OPTIONS = [3, 4, 5, 6, 7, 8];

export const INTRO_BACKGROUND_STYLES = [
  { id: 'navy-gradient', label: 'Navy gradient' },
  { id: 'spotlight', label: 'Spotlight' },
  { id: 'electric', label: 'Electric dark' },
];

const DEFAULT_INTRO_STUDIO = {
  template: 'cinematic-reveal',
  durationSec: 5,
  showPhoto: true,
  showRole: true,
  showStats: true,
  backgroundStyle: 'navy-gradient',
  animationSpeed: 1,
  photoScalePercent: 100,
  introScalePercent: 100,
  displayFields: [
    'battingStyle',
    'bowlingStyle',
    'age',
    'city',
    'previousTeam',
    'matches',
    'runs',
    'wickets',
  ],
};

export const INTRO_FIELD_CATALOG = [
  {
    id: 'battingStyle',
    label: 'Batting style',
    aliases: ['battingstyle', 'batstyle', 'batting', 'bat'],
    resolve: (player, extras) => pickExtra(extras, ['battingstyle', 'batstyle', 'batting'])?.value,
  },
  {
    id: 'bowlingStyle',
    label: 'Bowling style',
    aliases: ['bowlingstyle', 'bowling', 'bowlstyle', 'bowl'],
    resolve: (player, extras) => pickExtra(extras, ['bowlingstyle', 'bowling', 'bowlstyle'])?.value,
  },
  {
    id: 'age',
    label: 'Age',
    aliases: ['age', 'playerage'],
    resolve: (player, extras) => player?.age || pickExtra(extras, ['age'])?.value,
  },
  {
    id: 'city',
    label: 'City / Area',
    aliases: ['city', 'area', 'village', 'town', 'location', 'district'],
    resolve: (player, extras) => pickExtra(extras, ['city', 'area', 'village', 'town', 'location'])?.value,
  },
  {
    id: 'previousTeam',
    label: 'Previous team',
    aliases: ['previousteam', 'club', 'teamhistory', 'pastteam'],
    resolve: (player, extras) => player?.teamName || pickExtra(extras, ['previousteam', 'club', 'pastteam'])?.value,
  },
  {
    id: 'matches',
    label: 'Matches',
    aliases: ['matches', 'statsmatches'],
    resolve: (player) => (player?.statsMatches != null ? statValue(player.statsMatches) : null),
  },
  {
    id: 'runs',
    label: 'Runs',
    aliases: ['runs', 'statsruns'],
    resolve: (player) => (player?.statsRuns != null ? statValue(player.statsRuns) : null),
  },
  {
    id: 'wickets',
    label: 'Wickets',
    aliases: ['wickets', 'statswickets'],
    resolve: (player) => (player?.statsWickets != null ? statValue(player.statsWickets) : null),
  },
];

function pickExtra(extras, keys) {
  const wanted = new Set(keys.map(normalizeHeader));
  return extras.find((e) => wanted.has(e.key));
}

function isMeaningful(value) {
  if (value == null) return false;
  const s = String(value).trim();
  return s !== '' && s !== '—' && s !== '–' && s.toLowerCase() !== 'n/a';
}

export function parseIntroStudioConfig(raw) {
  if (!raw) return { ...DEFAULT_INTRO_STUDIO };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      ...DEFAULT_INTRO_STUDIO,
      ...parsed,
      displayFields: Array.isArray(parsed.displayFields) ? parsed.displayFields : DEFAULT_INTRO_STUDIO.displayFields,
    };
  } catch {
    return { ...DEFAULT_INTRO_STUDIO };
  }
}

export function serializeIntroStudioConfig(studio) {
  return JSON.stringify({ ...DEFAULT_INTRO_STUDIO, ...studio });
}

export function introDurationMs(config, fallbackMs) {
  const studio = parseIntroStudioConfig(config?.overlayMainIntroConfig);
  const sec = Number(studio.durationSec);
  if (Number.isFinite(sec) && sec >= 3 && sec <= 8) return sec * 1000;
  return Math.max(3000, Number(fallbackMs) || 5000);
}

export function introExitMs(config) {
  const speed = Math.max(0.5, Math.min(2, Number(parseIntroStudioConfig(config?.overlayMainIntroConfig).animationSpeed) || 1));
  return Math.round(420 / speed);
}

export function collectIntroDetailRows(player, studio, customHeaders = []) {
  if (!studio.showStats) return [];
  const enabled = new Set(studio.displayFields || []);
  const extras = parsePlayerExtraEntries(player);
  const rows = [];

  for (const field of INTRO_FIELD_CATALOG) {
    if (!enabled.has(field.id)) continue;
    const value = field.resolve(player, extras);
    if (!isMeaningful(value)) continue;
    rows.push({ label: field.label, value: String(value).trim() });
  }

  const used = new Set(rows.map((r) => normalizeHeader(r.label)));
  for (const header of customHeaders) {
    if (!header?.trim()) continue;
    const match = extras.find((e) => e.key === normalizeHeader(header));
    if (!match || used.has(match.key) || !isMeaningful(match.value)) continue;
    rows.push({ label: match.label, value: match.value });
  }

  return rows.slice(0, 8);
}

export const INTRO_PREVIEW_PLAYER = {
  id: 108,
  name: 'Pankaj Patil',
  role: 'ALLROUNDER',
  basePrice: 5000,
  age: '28',
  statsMatches: 42,
  statsRuns: 860,
  statsWickets: 18,
  extraData: {
    'Batting Style': 'Right-hand',
    'Bowling Style': 'Right-arm medium',
    City: 'Pune',
    'Previous Team': 'Local League XI',
  },
};
