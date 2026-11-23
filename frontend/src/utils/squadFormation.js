import { formatDisplayName, getRoleShortLabel, OVERLAY_PLAYER_NAME_MAX } from './formatters';

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
export function computeFilledGridLayout(itemCount, maxRows = 4) {
  const items = Math.max(1, itemCount);
  const rowCap = Math.max(3, Math.min(6, maxRows));
  let cols = items <= 4 ? Math.min(4, items) : 5;
  let rows = Math.ceil(items / cols);

  if (rows > rowCap) {
    cols = Math.min(8, Math.max(5, Math.ceil(items / rowCap)));
    rows = Math.ceil(items / cols);
  }

  let density = 'relaxed';
  if (items > 4) density = 'cozy';
  if (items > 8) density = 'compact';
  if (items > 12) density = 'dense';

  return { cols, rows, density };
}

/** Overlay broadcast: size cards from actual filled count — avoid huge empty slots early in the draft */
export function computeOverlayGridVars(itemCount, { audience = false } = {}) {
  const layout = computeFilledGridLayout(itemCount, audience ? 5 : 4);
  const items = Math.max(1, itemCount);
  const vh = audience ? 1.18 : 1;

  if (items <= 2) {
    return { ...layout, cardMaxWidth: audience ? '280px' : '240px', photoMaxHeight: `min(${28 * vh}vh, ${audience ? 260 : 220}px)` };
  }
  if (items <= 4) {
    return { ...layout, cardMaxWidth: audience ? '230px' : '200px', photoMaxHeight: `min(${22 * vh}vh, ${audience ? 210 : 175}px)` };
  }
  if (items <= 8) {
    return { ...layout, cardMaxWidth: audience ? '196px' : '168px', photoMaxHeight: `min(${18 * vh}vh, ${audience ? 178 : 150}px)` };
  }
  if (items <= 12) {
    return { ...layout, cardMaxWidth: audience ? '168px' : '142px', photoMaxHeight: `min(${15 * vh}vh, ${audience ? 150 : 128}px)` };
  }
  if (items <= 18) {
    return { ...layout, cardMaxWidth: audience ? '148px' : '132px', photoMaxHeight: `min(${13 * vh}vh, ${audience ? 132 : 118}px)` };
  }
  return { ...layout, cardMaxWidth: audience ? '132px' : '124px', photoMaxHeight: `min(${12 * vh}vh, ${audience ? 118 : 112}px)` };
}

export function squadProgress(filledCount, squadSize) {
  const total = clampSquadSize(squadSize);
  const filled = Math.max(0, Math.min(total, Number(filledCount) || 0));
  const remaining = Math.max(0, total - filled);
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, remaining, percent };
}

/** @deprecated Use formatDisplayName — kept for any external imports */
export function firstName(name) {
  return formatDisplayName(name, OVERLAY_PLAYER_NAME_MAX);
}

export function sortRetainedFirst(players) {
  return [...(players || [])].sort((a, b) => {
    const retainedOrder = Number(Boolean(b.retained)) - Number(Boolean(a.retained));
    if (retainedOrder !== 0) return retainedOrder;
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
  });
}

export function toSlotPlayer(player, playerRoles, nameMaxLen = OVERLAY_PLAYER_NAME_MAX) {
  if (!player) return null;
  const fullName = String(player.name || '').trim() || 'Player';
  return {
    id: player.id,
    name: formatDisplayName(fullName, nameMaxLen),
    fullName,
    imageUrl: player.imageUrl || null,
    role: getRoleShortLabel(player.role, playerRoles),
    retained: Boolean(player.retained),
  };
}

export function squadPlayersFromTeam(team) {
  const list = (Array.isArray(team?.players) ? team.players : [])
    .filter((player) => player && (player.name || player.id != null));
  return sortRetainedFirst(list);
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

/** Merge local overlay roster with server team data; server wins when it has the fuller squad. */
export function mergeBoardPlayers(localPlayers, team, playerRoles, includePrices = false) {
  const server = boardPlayersFromTeam(team, playerRoles, includePrices);
  const local = Array.isArray(localPlayers) ? localPlayers : [];
  const expected = Math.max(Number(team?.playerCount) || 0, server.length);

  if (!local.length) return server;
  if (!server.length) return local;
  let merged;
  if (server.length >= expected || server.length >= local.length) {
    merged = mergePlayersById(server, local);
  } else {
    merged = mergePlayersById(local, server);
  }
  return sortRetainedFirst(merged);
}

export function mergePlayersById(primary, secondary) {
  const byId = new Map((primary || []).map((player) => [String(player.id), player]));
  for (const player of secondary || []) {
    const key = String(player.id);
    byId.set(key, byId.has(key) ? { ...byId.get(key), ...player } : player);
  }
  return Array.from(byId.values());
}

export function buildRosterByTeam(teams, playerRoles, includePrices = false) {
  const roster = {};
  for (const team of teams || []) {
    roster[team.id] = boardPlayersFromTeam(team, playerRoles, includePrices);
  }
  return roster;
}

export function teamHasServerRoster(team) {
  return squadPlayersFromTeam(team).length > 0;
}
