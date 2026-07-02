/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { CINEMATIC_INTRO_MS } from '../constants/cinematicIntroTiming';

/**
 * Audience Display only — plays a full-screen cinematic when a new auction session starts.
 * forcePlayKey: increment to replay intro (e.g. after tournament countdown GO).
 */
export function useCinematicPlayerIntro(sessionId, status, enabled, durationMs = CINEMATIC_INTRO_MS, forcePlayKey = 0) {
  const [isPlaying, setIsPlaying] = useState(false);
  const lastSessionRef = useRef(null);
  const skipInitialRef = useRef(true);
  const lastForceRef = useRef(forcePlayKey);

  const startIntro = () => {
    setIsPlaying(true);
    return setTimeout(
      () => setIsPlaying(false),
      Math.max(3000, Number(durationMs) || CINEMATIC_INTRO_MS)
    );
  };

  useEffect(() => {
    if (!sessionId || status !== 'ACTIVE') {
      setIsPlaying(false);
      return undefined;
    }

    if (forcePlayKey !== lastForceRef.current) {
      lastForceRef.current = forcePlayKey;
      if (!enabled || forcePlayKey === 0) return undefined;
      const timer = startIntro();
      return () => clearTimeout(timer);
    }

    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      lastSessionRef.current = sessionId;
      return undefined;
    }

    if (lastSessionRef.current === sessionId) return undefined;
    lastSessionRef.current = sessionId;

    if (!enabled) {
      setIsPlaying(false);
      return undefined;
    }

    const timer = startIntro();
    return () => clearTimeout(timer);
  }, [durationMs, enabled, forcePlayKey, sessionId, status]);

  useEffect(() => {
    if (!enabled) setIsPlaying(false);
  }, [enabled]);

  return {
    isPlaying,
    sessionReady: !isPlaying,
  };
}
