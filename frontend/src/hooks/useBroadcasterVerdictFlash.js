import { useEffect, useState } from 'react';

/** After SOLD/UNSOLD, hide verdict UI on broadcaster pages after a few seconds. */
export const BROADCASTER_VERDICT_FLASH_MS = 3500;

export function useBroadcasterVerdictFlash(auction) {
  const [dismissedSession, setDismissedSession] = useState(null);
  const status = auction?.status;
  const sessionId = auction?.sessionId;

  useEffect(() => {
    if ((status === 'SOLD' || status === 'UNSOLD') && sessionId != null) {
      const t = setTimeout(
        () => setDismissedSession(String(sessionId)),
        BROADCASTER_VERDICT_FLASH_MS,
      );
      return () => clearTimeout(t);
    }
    if (status === 'ACTIVE') setDismissedSession(null);
    return undefined;
  }, [status, sessionId]);

  return (
    (status === 'SOLD' || status === 'UNSOLD')
    && sessionId != null
    && String(sessionId) !== dismissedSession
  );
}
