/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { CINEMATIC_INTRO_MS } from '../constants/cinematicIntroTiming';

/**
 * Audience Display only — plays a full-screen cinematic when a new auction session starts.
 * Returns isPlaying while the sequence runs; sessionReady when main layout can show stats intro.
 */
export function useCinematicPlayerIntro(sessionId, status, enabled, durationMs = CINEMATIC_INTRO_MS) {
  const [isPlaying, setIsPlaying] = useState(false);
  const lastSessionRef = useRef(null);
  const skipInitialRef = useRef(true);

  useEffect(() => {
    if (!sessionId || status !== 'ACTIVE') {
      setIsPlaying(false);
      return;
    }

    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      lastSessionRef.current = sessionId;
      return;
    }

    if (lastSessionRef.current === sessionId) return;
    lastSessionRef.current = sessionId;

    if (!enabled) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const timer = setTimeout(
      () => setIsPlaying(false),
      Math.max(3000, Number(durationMs) || CINEMATIC_INTRO_MS)
    );
    return () => clearTimeout(timer);
  }, [durationMs, enabled, sessionId, status]);

  useEffect(() => {
    if (!enabled) setIsPlaying(false);
  }, [enabled]);

  return {
    isPlaying,
    sessionReady: !isPlaying,
  };
}
