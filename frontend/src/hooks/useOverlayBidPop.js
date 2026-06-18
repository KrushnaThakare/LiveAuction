/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';

/**
 * Fires a short CSS pop class when bidRevision changes — no extra network load.
 */
export function useOverlayBidPop(bidRevision, enabled = true) {
  const [isPopping, setIsPopping] = useState(false);
  const lastRevisionRef = useRef(null);
  const skipInitialRef = useRef(true);

  useEffect(() => {
    if (!enabled || bidRevision == null) return undefined;

    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      lastRevisionRef.current = bidRevision;
      return undefined;
    }

    if (lastRevisionRef.current === bidRevision) return undefined;
    lastRevisionRef.current = bidRevision;

    setIsPopping(true);
    const timer = setTimeout(() => setIsPopping(false), 420);
    return () => clearTimeout(timer);
  }, [bidRevision, enabled]);

  return isPopping;
}
