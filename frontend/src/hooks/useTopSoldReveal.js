import { useCallback, useEffect, useRef, useState } from 'react';
import { overlayApi } from '../api/overlay';

function normalizeSignalId(id) {
  if (id == null) return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

/**
 * Break overlay — plays top-5 reveal when admin triggers from auction desk.
 * Ignores stale signal ids on initial mount (same pattern as audience countdown).
 */
export function useTopSoldReveal(auction, tournamentId, token) {
  const [active, setActive] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastIdRef = useRef(null);
  const seededRef = useRef(false);

  const fetchPlayers = useCallback(async () => {
    if (!tournamentId) return [];
    setLoading(true);
    try {
      const res = await overlayApi.getTopSold(tournamentId, token, 5);
      const list = res.data?.data || [];
      setPlayers(list);
      return list;
    } catch {
      setPlayers([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [tournamentId, token]);

  const dismiss = useCallback(() => {
    setActive(null);
    const id = normalizeSignalId(lastIdRef.current);
    if (id != null && tournamentId) {
      try {
        const key = `overlay-top-sold-seen:${tournamentId}`;
        const seen = JSON.parse(sessionStorage.getItem(key) || '[]');
        if (!seen.includes(id)) {
          sessionStorage.setItem(key, JSON.stringify([...seen, id].slice(-20)));
        }
      } catch {
        /* sessionStorage optional */
      }
    }
  }, [tournamentId]);

  const activate = useCallback(async (id) => {
    const list = await fetchPlayers();
    setActive({ id, players: list });
  }, [fetchPlayers]);

  useEffect(() => {
    const id = normalizeSignalId(auction?.audienceTopSoldId);
    if (id == null) return;

    if (!seededRef.current) {
      seededRef.current = true;
      lastIdRef.current = id;
      return;
    }

    if (lastIdRef.current === id) return;

    let alreadySeen = false;
    if (tournamentId) {
      try {
        const key = `overlay-top-sold-seen:${tournamentId}`;
        const seen = JSON.parse(sessionStorage.getItem(key) || '[]');
        alreadySeen = seen.includes(id);
      } catch {
        alreadySeen = false;
      }
    }

    lastIdRef.current = id;
    if (alreadySeen) return;

    activate(id);
  }, [auction?.audienceTopSoldId, tournamentId, activate]);

  return {
    active,
    players: active?.players?.length ? active.players : players,
    loading,
    dismiss,
    refetch: fetchPlayers,
  };
}
