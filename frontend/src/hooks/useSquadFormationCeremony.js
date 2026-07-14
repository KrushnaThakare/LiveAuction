import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildRosterByTeam,
  clampSquadSize,
  mergePlayersById,
  squadPlayersFromTeam,
  teamHasServerRoster,
  toSlotPlayer,
} from '../utils/squadFormation';

const FLY_MS = 820;
const HOLD_MS = 3500;
const ENTER_MS = 400;
const EXIT_MS = 600;
const NEW_PLAYER_HIGHLIGHT_MS = 2000;

function hydrateRoster(teams, playerRoles) {
  return buildRosterByTeam(teams, playerRoles, false);
}

export function useSquadFormationCeremony(enabled, teams, playerRoles, configuredSquadSize) {
  const squadSize = useMemo(() => clampSquadSize(configuredSquadSize), [configuredSquadSize]);
  const [roster, setRoster] = useState({});
  const hydratedRef = useRef(false);
  const [phase, setPhase] = useState(null);
  const [flyRequest, setFlyRequest] = useState(null);
  const [newPlayerKey, setNewPlayerKey] = useState(null);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [saleSummary, setSaleSummary] = useState(null);
  const slotRefs = useRef({});
  const sourceRef = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!enabled) {
      hydratedRef.current = false;
      clearTimers();
      return;
    }

    if (!teams?.length) return;

    const serverRoster = hydrateRoster(teams, playerRoles);
    const hasServerRosters = teams.some(teamHasServerRoster);
    const hasSoldPlayers = teams.some((team) => Number(team.playerCount) > 0);

    if (!hydratedRef.current) {
      if (hasSoldPlayers && !hasServerRosters) return;
      setRoster(serverRoster);
      hydratedRef.current = true;
      return;
    }

    setRoster((current) => {
      const merged = { ...current };
      let changed = false;

      for (const team of teams) {
        const serverPlayers = serverRoster[team.id] || [];
        const localPlayers = merged[team.id] || [];
        const expected = Math.max(Number(team.playerCount) || 0, serverPlayers.length);

        if (serverPlayers.length > 0 && (localPlayers.length < serverPlayers.length || localPlayers.length < expected)) {
          merged[team.id] = serverPlayers;
          changed = true;
          continue;
        }

        if (!serverPlayers.length) continue;

        const nextPlayers = mergePlayersById(localPlayers, serverPlayers);
        if (nextPlayers.length !== localPlayers.length) {
          merged[team.id] = nextPlayers;
          changed = true;
        }
      }

      return changed ? merged : current;
    });
  }, [enabled, teams, playerRoles, clearTimers]);

  const registerNextSlot = useCallback((teamId, node) => {
    const key = `${teamId}:next`;
    if (node) slotRefs.current[key] = node;
    else delete slotRefs.current[key];
  }, []);

  const appendSoldPlayer = useCallback((teamId, player) => {
    setRoster((current) => {
      const list = current[teamId] || [];
      if (list.some((entry) => entry && String(entry.id) === String(player.id))) return current;
      return { ...current, [teamId]: [...list, player] };
    });
    setNewPlayerKey(`${teamId}:${player.id}`);
    window.setTimeout(() => setNewPlayerKey(null), NEW_PLAYER_HIGHLIGHT_MS);
  }, []);

  const finishCeremony = useCallback(() => {
    setPhase('exit');
    const timer = window.setTimeout(() => {
      setPhase(null);
      setFlyRequest(null);
      setActiveTeamId(null);
      setSaleSummary(null);
    }, EXIT_MS);
    timersRef.current.push(timer);
  }, []);

  const startFly = useCallback((sale) => {
    const teamId = sale.teamId;
    const targetNode = slotRefs.current[`${teamId}:next`];
    const sourceRect = sourceRef.current?.getBoundingClientRect();
    const targetRect = targetNode?.getBoundingClientRect();
    const player = {
      id: sale.playerId,
      name: sale.name,
      fullName: sale.name,
      imageUrl: sale.playerImageUrl,
      role: sale.playerRole,
    };

    if (!sourceRect || !targetRect) {
      appendSoldPlayer(teamId, toSlotPlayer(player, playerRoles));
      setPhase('hold');
      const timer = window.setTimeout(finishCeremony, HOLD_MS);
      timersRef.current.push(timer);
      return;
    }

    setFlyRequest({
      player: toSlotPlayer(player, playerRoles),
      teamId,
      fromRect: sourceRect,
      toRect: targetRect,
    });
    setPhase('flying');
  }, [appendSoldPlayer, finishCeremony, playerRoles]);

  const beginCeremony = useCallback((sale) => {
    if (!enabled || !sale?.teamId || !sale?.playerId) return;
    clearTimers();
    setActiveTeamId(sale.teamId);
    setSaleSummary({
      name: sale.name,
      amount: sale.amount,
      team: sale.team,
    });
    setPhase('enter');
    const enterTimer = window.setTimeout(() => {
      setPhase('grid');
      const flyTimer = window.setTimeout(() => startFly(sale), 120);
      timersRef.current.push(flyTimer);
    }, ENTER_MS);
    timersRef.current.push(enterTimer);
  }, [clearTimers, enabled, startFly]);

  const completeFly = useCallback(() => {
    if (!flyRequest) return;
    appendSoldPlayer(flyRequest.teamId, flyRequest.player);
    setFlyRequest(null);
    setPhase('hold');
    const timer = window.setTimeout(finishCeremony, HOLD_MS);
    timersRef.current.push(timer);
  }, [appendSoldPlayer, finishCeremony, flyRequest]);

  const teamRoster = useMemo(() => {
    const map = {};
    for (const team of teams || []) {
      const local = roster[team.id] || [];
      const server = squadPlayersFromTeam(team).map((player) => toSlotPlayer(player, playerRoles));
      const expected = Math.max(Number(team.playerCount) || 0, server.length);
      if (server.length >= expected || server.length >= local.length) {
        map[team.id] = mergePlayersById(server, local);
      } else {
        map[team.id] = local;
      }
    }
    return map;
  }, [teams, roster, playerRoles]);

  return {
    active: phase != null,
    phase,
    squadSize,
    teamRoster,
    flyRequest,
    newPlayerKey,
    activeTeamId,
    saleSummary,
    sourceRef,
    registerNextSlot,
    beginCeremony,
    completeFly,
    flyDurationMs: FLY_MS,
    exitDurationMs: EXIT_MS,
  };
}
