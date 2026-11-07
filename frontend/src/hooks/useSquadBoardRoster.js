import { useEffect, useMemo, useRef, useState } from 'react';
import {
  boardPlayersFromTeam,
  buildRosterByTeam,
  mergeBoardPlayers,
  teamHasServerRoster,
  toSlotPlayer,
} from '../utils/squadFormation';
import { getRoleShortLabel } from '../utils/formatters';

/** Keeps per-team sold rosters in sync with WebSocket teams + latest SOLD event. */
export function useSquadBoardRoster(teams, playerRoles, auction) {
  const [rosterByTeam, setRosterByTeam] = useState({});
  const lastSoldKeyRef = useRef('');

  useEffect(() => {
    if (!teams.length) return;
    const serverRoster = buildRosterByTeam(teams, playerRoles, true);
    const hasAnyServerRoster = teams.some(teamHasServerRoster);

    setRosterByTeam((current) => {
      let changed = false;
      const next = { ...current };

      for (const team of teams) {
        const serverPlayers = serverRoster[team.id] || [];
        const localPlayers = next[team.id] || [];
        const expected = Math.max(Number(team.playerCount) || 0, serverPlayers.length);

        if (serverPlayers.length > 0 && (localPlayers.length < serverPlayers.length || localPlayers.length < expected)) {
          next[team.id] = serverPlayers;
          changed = true;
          continue;
        }

        if (!serverPlayers.length) continue;

        const merged = mergeBoardPlayers(localPlayers, team, playerRoles, true);
        if (merged.length !== localPlayers.length) {
          next[team.id] = merged;
          changed = true;
        }
      }

      if (!hasAnyServerRoster && !Object.keys(current).length) {
        return current;
      }

      return changed ? next : current;
    });
  }, [teams, playerRoles]);

  useEffect(() => {
    if (!auction || auction.status !== 'SOLD') return;
    const player = auction.currentPlayer;
    const teamId = auction.highestBidderTeamId;
    const team = teams.find((entry) => String(entry.id) === String(teamId));
    if (!player?.id || !teamId || !team) return;

    const soldKey = `${auction.sessionId || 'session'}:${player.id}`;
    if (lastSoldKeyRef.current === soldKey) return;

    const serverPlayers = boardPlayersFromTeam(team, playerRoles, true);
    if (serverPlayers.some((entry) => String(entry.id) === String(player.id))) {
      lastSoldKeyRef.current = soldKey;
      return;
    }

    lastSoldKeyRef.current = soldKey;

    const slotPlayer = {
      ...toSlotPlayer(player, playerRoles),
      soldPrice: auction.currentBid ?? player.currentBid ?? player.basePrice ?? 0,
      role: getRoleShortLabel(player.role, playerRoles),
    };

    setRosterByTeam((current) => {
      const list = current[teamId] || [];
      if (list.some((entry) => String(entry.id) === String(player.id))) return current;
      return { ...current, [teamId]: [...list, slotPlayer] };
    });
  }, [auction, playerRoles, teams]);

  const filledForTeam = useMemo(() => {
    const map = {};
    for (const team of teams) {
      map[team.id] = mergeBoardPlayers(rosterByTeam[team.id], team, playerRoles, true);
    }
    return map;
  }, [rosterByTeam, teams, playerRoles]);

  return { rosterByTeam, filledForTeam };
}
