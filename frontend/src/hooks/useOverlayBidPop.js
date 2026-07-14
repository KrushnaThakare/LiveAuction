/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { PLAYER_TRANSITION_MS } from '../constants/playerTransitionTiming';

/**
 * Fires a short CSS pop when the live bid amount changes.
 * Uses currentBid (not only bidRevision) so optimistic overlay updates still animate.
 */
export function useOverlayBidPop(currentBid, sessionId, enabled = true) {
  const [popToken, setPopToken] = useState(0);
  const lastBidRef = useRef(null);
  const lastSessionRef = useRef(null);
  const skipInitialRef = useRef(true);

  useEffect(() => {
    if (!enabled || sessionId == null) return undefined;

    const bid = Number(currentBid ?? 0);

    if (skipInitialRef.current || lastSessionRef.current !== sessionId) {
      skipInitialRef.current = false;
      lastSessionRef.current = sessionId;
      lastBidRef.current = bid;
      return undefined;
    }

    if (lastBidRef.current === bid) return undefined;
    lastBidRef.current = bid;
    setPopToken(token => token + 1);

    return undefined;
  }, [currentBid, sessionId, enabled]);

  return popToken;
}
