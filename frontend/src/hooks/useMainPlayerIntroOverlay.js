/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';

/**
 * Main overlay (OBS) — brief player reveal when a new auction session starts.
 * Returns sessionReady=false while intro plays so stats intro can run after.
 */
export function useMainPlayerIntroOverlay(player, sessionId, enabled = true, durationMs = 4500) {
  const [visible, setVisible] = useState(false);
  const [sessionReady, setSessionReady] = useState(true);
  const lastSessionRef = useRef(null);

  useEffect(() => {
    if (!enabled || !sessionId || lastSessionRef.current === sessionId) return undefined;
    lastSessionRef.current = sessionId;

    if (!player) {
      setVisible(false);
      setSessionReady(true);
      return undefined;
    }

    setVisible(true);
    setSessionReady(false);
    const ms = Math.max(1500, Number(durationMs) || 4500);
    const timer = setTimeout(() => {
      setVisible(false);
      setSessionReady(true);
    }, ms);
    return () => clearTimeout(timer);
  }, [durationMs, enabled, player, sessionId]);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      setSessionReady(true);
    }
  }, [enabled]);

  return { visible, sessionReady };
}
