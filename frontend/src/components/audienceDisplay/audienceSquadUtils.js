import { driveImg } from '../../utils/driveImage';
import { resolveUrl } from '../../utils/resolveUrl';

export function playerFirstName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'Player';
  return trimmed.split(/\s+/)[0];
}

export function toSquadPlayer(player, roleFallback = '') {
  if (!player?.id) return null;
  return {
    id: player.id,
    firstName: playerFirstName(player.name),
    role: player.role || roleFallback,
    imageUrl: driveImg(player.imageUrl) || resolveUrl(player.imageUrl) || '',
  };
}

export function squadsFromTeams(teams = []) {
  const squads = {};
  for (const team of teams) {
    if (!team?.id || !Array.isArray(team.players) || !team.players.length) continue;
    squads[team.id] = team.players
      .map((player) => toSquadPlayer(player))
      .filter(Boolean);
  }
  return squads;
}
