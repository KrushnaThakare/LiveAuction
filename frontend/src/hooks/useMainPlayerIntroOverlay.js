/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { introDurationMs, introExitMs } from '../utils/overlayIntroStudio';

/**
 * Main overlay player introduction — once per auction session while ACTIVE.
 * Phases: hidden → playing → exiting → hidden (restores lower third).
 */
export function useMainPlayerIntroOverlay(player, sessionId, enabled, config, status) {
  const [phase, setPhase] = useState('hidden');
  const holdTimerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const activeSessionRef = useRef(null);
  const playerRef = useRef(player);

  const clearTimers = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const startIntro = (sid) => {
    clearTimers();
    if (!playerRef.current) {
      setPhase('hidden');
      return;
    }
    activeSessionRef.current = sid;
    setPhase('playing');
    const holdMs = introDurationMs(config, config?.overlayMainPlayerIntroMs);
    const exitMs = introExitMs(config);
    holdTimerRef.current = setTimeout(() => {
      setPhase('exiting');
      exitTimerRef.current = setTimeout(() => {
        setPhase('hidden');
        exitTimerRef.current = null;
      }, exitMs);
    }, holdMs);
  };

  useEffect(() => {
    if (!enabled || status !== 'ACTIVE' || !sessionId) {
      if (status !== 'ACTIVE') {
        clearTimers();
        setPhase('hidden');
        activeSessionRef.current = null;
      }
      return undefined;
    }

    if (String(activeSessionRef.current) === String(sessionId)) {
      return undefined;
    }

    startIntro(sessionId);
    return clearTimers;
  }, [config, enabled, sessionId, status]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setPhase('hidden');
    }
  }, [enabled]);

  return {
    phase,
    visible: phase === 'playing' || phase === 'exiting',
    exiting: phase === 'exiting',
    sessionReady: phase === 'hidden',
    introPlayer: player,
  };
}

/** Studio preview only — does not touch auction sessions. */
export function useIntroStudioTestPulse(durationMs, exitMs) {
  const [phase, setPhase] = useState('hidden');
  const [replayKey, setReplayKey] = useState(0);
  const timersRef = useRef([]);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
  }, []);

  const trigger = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setReplayKey((k) => k + 1);
    setPhase('playing');
    const t1 = setTimeout(() => {
      setPhase('exiting');
      const t2 = setTimeout(() => setPhase('hidden'), exitMs);
      timersRef.current.push(t2);
    }, durationMs);
    timersRef.current.push(t1);
  };

  return {
    phase,
    visible: phase === 'playing' || phase === 'exiting',
    exiting: phase === 'exiting',
    replayKey,
    trigger,
  };
}
