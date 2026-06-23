import { getRoleShortLabel } from './formatters';

export const DEFAULT_SQUAD_SIZE = 15;
export const MIN_SQUAD_SIZE = 5;
export const MAX_SQUAD_SIZE = 30;

export function clampSquadSize(value, fallback = DEFAULT_SQUAD_SIZE) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(MIN_SQUAD_SIZE, Math.min(MAX_SQUAD_SIZE, Math.round(parsed)));
}

export function resolveSquadSize(config, fallback = DEFAULT_SQUAD_SIZE) {
  return clampSquadSize(config?.maxSquadSize, fallback);
}

export function computeSquadGridColumns(squadSize) {
  const size = clampSquadSize(squadSize);
  if (size <= 10) return 5;
  if (size <= 12) return 4;
  return 5;
}

/** Grid layout for filled player cards — keeps full squad visible on one screen */
export function computeFilledGridLayout(itemCount) {
  const items = Math.max(1, itemCount);
  const maxRows = 4;
  let cols = items <= 4 ? Math.min(4, items) : 5;
  let rows = Math.ceil(items / cols);

  if (rows > maxRows) {
    cols = Math.min(8, Math.max(5, Math.ceil(items / maxRows)));
    rows = Math.ceil(items / cols);
  }

  let density = 'relaxed';
  if (items > 4) density = 'cozy';
  if (items > 8) density = 'compact';
  if (items > 12) density = 'dense';

  return { cols, rows, density };
}

export function squadProgress(filledCount, squadSize) {
  const total = clampSquadSize(squadSize);
  const filled = Math.max(0, Math.min(total, Number(filledCount) || 0));
  const remaining = Math.max(0, total - filled);
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, remaining, percent };
}

export function firstName(name) {
  if (!name) return 'Player';
  const part = String(name).trim().split(/\s+/)[0];
  return part || 'Player';
}

export function toSlotPlayer(player, playerRoles) {
  if (!player) return null;
  return {
    id: player.id,
    name: firstName(player.name),
    fullName: player.name,
    imageUrl: player.imageUrl || null,
    role: getRoleShortLabel(player.role, playerRoles),
    retained: Boolean(player.retained),
  };
}

export function squadPlayersFromTeam(team) {
  const list = Array.isArray(team?.players) ? team.players : [];
  return list.filter((p) => p && (p.status === 'SOLD' || p.retained));
}

export function formatPurse(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export function formatCompactPurse(value) {
  const amount = Number(value) || 0;
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return formatPurse(amount);
}

export function boardPlayersFromTeam(team, playerRoles, includePrices = false) {
  return squadPlayersFromTeam(team).map((player) => ({
    ...toSlotPlayer(player, playerRoles),
    soldPrice: includePrices ? (player.currentBid ?? player.basePrice ?? 0) : undefined,
  }));
}
