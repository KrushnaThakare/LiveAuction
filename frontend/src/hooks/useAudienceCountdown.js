import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Audience Display — watches audienceCountdownId from overlay realtime.
 */
export function useAudienceCountdown(auction) {
  const [active, setActive] = useState(null);
  const lastIdRef = useRef(null);

  useEffect(() => {
    const id = auction?.audienceCountdownId;
    if (id == null) return;
    if (lastIdRef.current === id) return;
    lastIdRef.current = id;
    const seconds = auction?.audienceCountdownSeconds || 5;
    setActive({ id, seconds });
  }, [auction?.audienceCountdownId, auction?.audienceCountdownSeconds]);

  const dismiss = useCallback(() => setActive(null), []);

  return { active, dismiss };
}
