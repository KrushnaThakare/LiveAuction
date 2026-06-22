import { getRoleShortLabel } from './formatters';

export const DEFAULT_SQUAD_SLOTS = 13;

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

export function buildTeamSlots(team, squadSize, playerRoles, pendingAdd = null) {
  const roster = squadPlayersFromTeam(team).map((p) => toSlotPlayer(p, playerRoles));
  if (pendingAdd && String(pendingAdd.teamId) === String(team.id)) {
    const already = roster.some((p) => p && String(p.id) === String(pendingAdd.player.id));
    if (!already) roster.push(pendingAdd.player);
  }
  const slots = Array.from({ length: squadSize }, (_, index) => roster[index] || null);
  return slots;
}

export function resolveSquadSize(teams, fallback = DEFAULT_SQUAD_SLOTS) {
  if (!Array.isArray(teams) || !teams.length) return fallback;
  const maxRoster = teams.reduce((max, team) => {
    const count = Math.max(Number(team.playerCount || 0), squadPlayersFromTeam(team).length);
    return Math.max(max, count);
  }, 0);
  return Math.max(fallback, maxRoster);
}

export function formatPurse(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}
