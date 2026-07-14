/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { CINEMATIC_INTRO_MS } from '../constants/cinematicIntroTiming';

/**
 * Audience Display only — plays a full-screen cinematic when a new auction session starts.
 * When `enabled` is false (e.g. sold gavel still playing), the session is queued and plays
 * once enabled becomes true again.
 * forcePlayKey: increment to replay intro (e.g. after tournament countdown GO).
 */
export function useCinematicPlayerIntro(sessionId, status, enabled, durationMs = CINEMATIC_INTRO_MS, forcePlayKey = 0) {
  const [isPlaying, setIsPlaying] = useState(false);
  const lastSessionRef = useRef(null);
  const skipInitialRef = useRef(true);
  const lastForceRef = useRef(forcePlayKey);
  const pendingSessionRef = useRef(null);
  const playTimerRef = useRef(null);

  const clearPlayTimer = () => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  };

  const startIntro = () => {
    clearPlayTimer();
    setIsPlaying(true);
    playTimerRef.current = setTimeout(
      () => {
        setIsPlaying(false);
        playTimerRef.current = null;
      },
      Math.max(3000, Number(durationMs) || CINEMATIC_INTRO_MS),
    );
    return playTimerRef.current;
  };

  useEffect(() => () => clearPlayTimer(), []);

  useEffect(() => {
    if (!sessionId || status !== 'ACTIVE') {
      setIsPlaying(false);
      if (status !== 'ACTIVE') {
        pendingSessionRef.current = null;
      }
      return undefined;
    }

    if (forcePlayKey !== lastForceRef.current) {
      lastForceRef.current = forcePlayKey;
      if (!enabled || forcePlayKey === 0) return undefined;
      lastSessionRef.current = sessionId;
      pendingSessionRef.current = null;
      startIntro();
      return clearPlayTimer;
    }

    if (skipInitialRef.current) {
      skipInitialRef.current = false;
      lastSessionRef.current = sessionId;
      return undefined;
    }

    const isNewSession = lastSessionRef.current !== sessionId;
    if (!isNewSession) return undefined;

    if (!enabled) {
      pendingSessionRef.current = sessionId;
      return undefined;
    }

    lastSessionRef.current = sessionId;
    pendingSessionRef.current = null;
    startIntro();
    return clearPlayTimer;
  }, [durationMs, enabled, forcePlayKey, sessionId, status]);

  useEffect(() => {
    if (!enabled || status !== 'ACTIVE' || !sessionId) return undefined;
    if (String(pendingSessionRef.current) !== String(sessionId)) return undefined;

    lastSessionRef.current = sessionId;
    pendingSessionRef.current = null;
    startIntro();
    return clearPlayTimer;
  }, [enabled, sessionId, status, durationMs]);

  useEffect(() => {
    if (!enabled) setIsPlaying(false);
  }, [enabled]);

  return {
    isPlaying,
    sessionReady: !isPlaying,
  };
}
