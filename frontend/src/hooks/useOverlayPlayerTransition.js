/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { PLAYER_TRANSITION_MS } from '../constants/playerTransitionTiming';

/**
 * Tracks player changes for main overlay card transition.
 * Returns exiting player layer + whether the incoming card should animate.
 */
export function useOverlayPlayerTransition(sessionId, player, enabled = true) {
  const [exitingPlayer, setExitingPlayer] = useState(null);
  const [isEntering, setIsEntering] = useState(false);
  const activePlayerRef = useRef(player);
  const lastSessionRef = useRef(null);
  const skipInitialRef = useRef(true);

  useEffect(() => {
    if (!sessionId) return undefined;

    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      lastSessionRef.current = sessionId;
      activePlayerRef.current = player;
      return undefined;
    }

    if (lastSessionRef.current === sessionId) {
      activePlayerRef.current = player;
      return undefined;
    }

    const previousPlayer = activePlayerRef.current;
    lastSessionRef.current = sessionId;
    activePlayerRef.current = player;

    if (!enabled) {
      setExitingPlayer(null);
      setIsEntering(false);
      return undefined;
    }

    setExitingPlayer(previousPlayer);
    setIsEntering(true);

    const timer = setTimeout(() => {
      setExitingPlayer(null);
      setIsEntering(false);
    }, PLAYER_TRANSITION_MS);

    return () => clearTimeout(timer);
  }, [sessionId, player, enabled]);

  return {
    exitingPlayer,
    displayPlayer: player,
    isEntering,
  };
}
