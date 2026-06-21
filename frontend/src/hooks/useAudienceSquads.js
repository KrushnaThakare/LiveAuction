import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { squadsFromTeams, toSquadPlayer } from '../components/audienceDisplay/audienceSquadUtils';

export function useAudienceSquads(enabled, teams) {
  const squadsRef = useRef({});
  const [version, setVersion] = useState(0);
  const hydratedRef = useRef(false);
  const [flyRequest, setFlyRequest] = useState(null);
  const [highlightTeamId, setHighlightTeamId] = useState(null);
  const [newPlayerId, setNewPlayerId] = useState(null);
  const slotNodesRef = useRef({});
  const imageFrameRef = useRef(null);
  const pendingSellRef = useRef(null);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const registerSlot = useCallback((teamId, node) => {
    if (node) slotNodesRef.current[teamId] = node;
    else delete slotNodesRef.current[teamId];
  }, []);

  const appendSoldPlayer = useCallback((teamId, squadPlayer) => {
    const current = squadsRef.current[teamId] || [];
    if (current.some((p) => p.id === squadPlayer.id)) return;
    squadsRef.current = {
      ...squadsRef.current,
      [teamId]: [...current, squadPlayer],
    };
    setHighlightTeamId(teamId);
    setNewPlayerId(squadPlayer.id);
    bump();
    window.setTimeout(() => setHighlightTeamId(null), 800);
    window.setTimeout(() => setNewPlayerId(null), 2000);
  }, [bump]);

  useEffect(() => {
    if (!enabled) {
      squadsRef.current = {};
      hydratedRef.current = false;
      setFlyRequest(null);
      setHighlightTeamId(null);
      setNewPlayerId(null);
      pendingSellRef.current = null;
      bump();
      return;
    }

    if (hydratedRef.current || !teams.length) return;
    const seeded = squadsFromTeams(teams);
    if (!Object.keys(seeded).length) return;
    squadsRef.current = seeded;
    hydratedRef.current = true;
    bump();
  }, [enabled, teams, bump]);

  const squads = useMemo(() => {
    void version;
    return squadsRef.current;
  }, [version]);

  const queueSoldFly = useCallback((soldPlayer, teamId) => {
    const squadPlayer = toSquadPlayer(soldPlayer);
    if (!squadPlayer || !teamId) return;
    pendingSellRef.current = { squadPlayer, teamId };
  }, []);

  const startFlyFromHammer = useCallback(() => {
    const pending = pendingSellRef.current;
    if (!pending || !enabled) return;

    const source = imageFrameRef.current?.getBoundingClientRect();
    const targetNode = slotNodesRef.current[pending.teamId];
    const anchor = targetNode?.querySelector('[data-team-id]');
    const target = (anchor || targetNode)?.getBoundingClientRect();
    if (!source || !target) {
      appendSoldPlayer(pending.teamId, pending.squadPlayer);
      pendingSellRef.current = null;
      return;
    }

    setFlyRequest({
      player: pending.squadPlayer,
      teamId: pending.teamId,
      fromRect: source,
      toRect: target,
    });
  }, [enabled, appendSoldPlayer]);

  const completeFly = useCallback(() => {
    if (!flyRequest) return;
    appendSoldPlayer(flyRequest.teamId, flyRequest.player);
    pendingSellRef.current = null;
    setFlyRequest(null);
  }, [appendSoldPlayer, flyRequest]);

  return {
    squads,
    imageFrameRef,
    registerSlot,
    queueSoldFly,
    startFlyFromHammer,
    completeFly,
    flyRequest,
    highlightTeamId,
    newPlayerId,
  };
}
