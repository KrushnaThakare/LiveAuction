import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Audience Display — plays countdown only when a NEW signal arrives after mount.
 * Ignores the persisted latest id on initial load so reopening the page stays idle.
 */
export function useAudienceCountdown(auction) {
  const [active, setActive] = useState(null);
  const lastIdRef = useRef(null);
  const seededRef = useRef(false);

  useEffect(() => {
    const id = auction?.audienceCountdownId;
    if (id == null) return;

    if (!seededRef.current) {
      seededRef.current = true;
      lastIdRef.current = id;
      return;
    }

    if (lastIdRef.current === id) return;
    lastIdRef.current = id;
    const seconds = auction?.audienceCountdownSeconds || 5;
    setActive({ id, seconds });
  }, [auction?.audienceCountdownId, auction?.audienceCountdownSeconds]);

  const dismiss = useCallback(() => setActive(null), []);

  return { active, dismiss };
}
