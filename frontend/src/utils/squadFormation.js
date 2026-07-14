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

/** Overlay broadcast: size cards from actual filled count — avoid huge empty slots early in the draft */
export function computeOverlayGridVars(itemCount) {
  const layout = computeFilledGridLayout(itemCount);
  const items = Math.max(1, itemCount);

  if (items <= 2) {
    return { ...layout, cardMaxWidth: '240px', photoMaxHeight: 'min(28vh, 220px)' };
  }
  if (items <= 4) {
    return { ...layout, cardMaxWidth: '200px', photoMaxHeight: 'min(22vh, 175px)' };
  }
  if (items <= 8) {
    return { ...layout, cardMaxWidth: '168px', photoMaxHeight: 'min(18vh, 150px)' };
  }
  if (items <= 12) {
    return { ...layout, cardMaxWidth: '142px', photoMaxHeight: 'min(15vh, 128px)' };
  }
  return { ...layout, cardMaxWidth: '124px', photoMaxHeight: 'min(13vh, 112px)' };
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
  return (Array.isArray(team?.players) ? team.players : [])
    .filter((player) => player && (player.name || player.id != null));
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
  if (server.length >= expected || server.length >= local.length) {
    return mergePlayersById(server, local);
  }
  return mergePlayersById(local, server);
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
