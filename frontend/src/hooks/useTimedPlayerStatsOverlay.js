/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { hasPlayerStats } from '../utils/playerStats';

export function useTimedPlayerStatsOverlay(player, sessionId, enabled = true, durationMs = 5500) {
  const [visible, setVisible] = useState(false);
  const lastSessionRef = useRef(null);

  useEffect(() => {
    if (!enabled || !sessionId || lastSessionRef.current === sessionId) return;
    lastSessionRef.current = sessionId;
    if (!hasPlayerStats(player)) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), Math.max(1000, Number(durationMs) || 5500));
    return () => clearTimeout(timer);
  }, [durationMs, enabled, player, sessionId]);

  return visible;
}
