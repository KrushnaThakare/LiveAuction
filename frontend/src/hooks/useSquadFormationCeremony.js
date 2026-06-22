import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  resolveSquadSize,
  squadPlayersFromTeam,
  toSlotPlayer,
} from '../utils/squadFormation';

const FLY_MS = 820;
const HOLD_MS = 3500;
const ENTER_MS = 400;
const EXIT_MS = 600;

function hydrateRoster(teams, playerRoles) {
  const roster = {};
  for (const team of teams || []) {
    roster[team.id] = squadPlayersFromTeam(team).map((player) => toSlotPlayer(player, playerRoles));
  }
  return roster;
}

export function useSquadFormationCeremony(enabled, teams, playerRoles) {
  const [roster, setRoster] = useState({});
  const hydratedRef = useRef(false);
  const [phase, setPhase] = useState(null);
  const [flyRequest, setFlyRequest] = useState(null);
  const [highlightTeamId, setHighlightTeamId] = useState(null);
  const [newPlayerKey, setNewPlayerKey] = useState(null);
  const slotRefs = useRef({});
  const sourceRef = useRef(null);
  const timersRef = useRef([]);

  const squadSize = useMemo(() => resolveSquadSize(teams), [teams]);

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

    if (hydratedRef.current || !teams?.length) return;
    setRoster(hydrateRoster(teams, playerRoles));
    hydratedRef.current = true;
  }, [enabled, teams, playerRoles, clearTimers]);

  useEffect(() => {
    if (!enabled || !hydratedRef.current || !teams?.length) return;
    setRoster((current) => {
      const merged = { ...current };
      let changed = false;
      for (const team of teams) {
        const serverPlayers = squadPlayersFromTeam(team).map((player) => toSlotPlayer(player, playerRoles));
        const local = merged[team.id] || [];
        const byId = new Map(local.filter(Boolean).map((player) => [String(player.id), player]));
        for (const player of serverPlayers) {
          if (!byId.has(String(player.id))) {
            byId.set(String(player.id), player);
            changed = true;
          } else {
            byId.set(String(player.id), { ...byId.get(String(player.id)), ...player });
          }
        }
        if (changed) merged[team.id] = Array.from(byId.values());
      }
      return changed ? merged : current;
    });
  }, [enabled, teams, playerRoles]);

  const registerSlot = useCallback((teamId, slotIndex, node) => {
    const key = `${teamId}:${slotIndex}`;
    if (node) slotRefs.current[key] = node;
    else delete slotRefs.current[key];
  }, []);

  const appendSoldPlayer = useCallback((teamId, player) => {
    setRoster((current) => {
      const list = current[teamId] || [];
      if (list.some((entry) => entry && String(entry.id) === String(player.id))) return current;
      return { ...current, [teamId]: [...list, player] };
    });
    setHighlightTeamId(teamId);
    setNewPlayerKey(`${teamId}:${player.id}`);
    window.setTimeout(() => setHighlightTeamId(null), 900);
    window.setTimeout(() => setNewPlayerKey(null), 2200);
  }, []);

  const finishCeremony = useCallback(() => {
    setPhase('exit');
    const timer = window.setTimeout(() => {
      setPhase(null);
      setFlyRequest(null);
    }, EXIT_MS);
    timersRef.current.push(timer);
  }, []);

  const startFly = useCallback((sale) => {
    const teamId = sale.teamId;
    const rosterList = roster[teamId] || [];
    const slotIndex = Math.min(rosterList.length, squadSize - 1);
    const targetNode = slotRefs.current[`${teamId}:${slotIndex}`];
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
      slotIndex,
      fromRect: sourceRect,
      toRect: targetRect,
    });
    setPhase('flying');
  }, [appendSoldPlayer, finishCeremony, playerRoles, roster, squadSize]);

  const beginCeremony = useCallback((sale) => {
    if (!enabled || !sale?.teamId || !sale?.playerId) return;
    clearTimers();
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

  const teamSlots = useMemo(() => {
    const map = {};
    for (const team of teams || []) {
      const players = roster[team.id] || [];
      map[team.id] = Array.from({ length: squadSize }, (_, index) => players[index] || null);
    }
    return map;
  }, [teams, squadSize, roster]);

  return {
    active: phase != null,
    phase,
    squadSize,
    teamSlots,
    flyRequest,
    highlightTeamId,
    newPlayerKey,
    sourceRef,
    registerSlot,
    beginCeremony,
    completeFly,
    flyDurationMs: FLY_MS,
    exitDurationMs: EXIT_MS,
  };
}
