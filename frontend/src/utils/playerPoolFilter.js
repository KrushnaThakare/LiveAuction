import { normalizeHeader, parsePlayerExtraEntries } from './playerDisplayExtras';

const ALL_VALUE = '__ALL__';

export function isPoolFilterActive(column, value) {
  return Boolean(column && value && value !== ALL_VALUE);
}

/** Union of Excel extra column labels across players (preserves display spelling). */
export function collectExtraColumnsFromPlayers(players = []) {
  const byNorm = new Map();
  for (const player of players) {
    for (const entry of parsePlayerExtraEntries(player)) {
      if (!byNorm.has(entry.key)) {
        byNorm.set(entry.key, entry.label);
      }
    }
  }
  return Array.from(byNorm.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export function getPlayerExtraFieldValue(player, columnLabel) {
  if (!columnLabel) return '';
  const target = normalizeHeader(columnLabel);
  for (const entry of parsePlayerExtraEntries(player)) {
    if (entry.key === target) return entry.value;
  }
  return '';
}

export function distinctValuesForColumn(players = [], columnLabel) {
  if (!columnLabel) return [];
  const values = new Set();
  for (const player of players) {
    const v = getPlayerExtraFieldValue(player, columnLabel);
    if (v) values.add(v);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function applyExtraPoolFilter(players = [], column, value) {
  if (!isPoolFilterActive(column, value)) return players;
  return players.filter((p) => getPlayerExtraFieldValue(p, column) === value);
}

export function pickRandomPlayer(players = []) {
  if (!players.length) return null;
  return players[Math.floor(Math.random() * players.length)];
}

export const POOL_FILTER_ALL = ALL_VALUE;
