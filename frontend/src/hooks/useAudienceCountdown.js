import { useCallback, useEffect, useRef, useState } from 'react';

function normalizeCountdownId(id) {
  if (id == null) return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

/**
 * Audience Display — plays countdown only when a NEW signal arrives after mount.
 * Ignores persisted/stale ids on initial load so reopening the page stays idle.
 */
export function useAudienceCountdown(auction, tournamentId) {
  const [active, setActive] = useState(null);
  const lastIdRef = useRef(null);
  const seededRef = useRef(false);

  const dismiss = useCallback(() => {
    setActive(null);
    const id = normalizeCountdownId(lastIdRef.current);
    if (id != null && tournamentId) {
      try {
        const key = `audience-countdown-seen:${tournamentId}`;
        const seen = JSON.parse(sessionStorage.getItem(key) || '[]');
        if (!seen.includes(id)) {
          sessionStorage.setItem(key, JSON.stringify([...seen, id].slice(-20)));
        }
      } catch {
        /* sessionStorage optional */
      }
    }
  }, [tournamentId]);

  useEffect(() => {
    const id = normalizeCountdownId(auction?.audienceCountdownId);
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
        const key = `audience-countdown-seen:${tournamentId}`;
        const seen = JSON.parse(sessionStorage.getItem(key) || '[]');
        alreadySeen = seen.includes(id);
      } catch {
        alreadySeen = false;
      }
    }

    lastIdRef.current = id;
    if (alreadySeen) return;

    const seconds = auction?.audienceCountdownSeconds || 5;
    setActive({ id, seconds });
  }, [auction?.audienceCountdownId, auction?.audienceCountdownSeconds, tournamentId]);

  return { active, dismiss };
}
