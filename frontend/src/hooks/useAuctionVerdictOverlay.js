import { useEffect, useRef, useState } from 'react';
import { resolveUrl } from '../utils/resolveUrl';
import { formatSquadPickLabel } from '../utils/formatters';

const SOLD_DURATION_MS = 5600;
const UNSOLD_DURATION_MS = 4200;

/**
 * Shows the gavel overlay once per closed auction session.
 * Ignores late SOLD/UNSOLD payloads after the admin has already started the next player.
 */
export function useAuctionVerdictOverlay(auction, teams) {
  const [soldOverlay, setSoldOverlay] = useState(null);
  const previousAuctionRef = useRef(null);
  const gavelShownForSessionRef = useRef(null);
  const gavelTimerRef = useRef(null);

  useEffect(() => () => {
    if (gavelTimerRef.current) clearTimeout(gavelTimerRef.current);
  }, []);

  useEffect(() => {
    const current = auction;
    const previous = previousAuctionRef.current;
    if (!current) return;

    const sameSession = previous?.sessionId != null && previous.sessionId === current.sessionId;

    if (previous?.status === 'ACTIVE' && sameSession) {
      if (current.status === 'SOLD') {
        const sessionKey = String(current.sessionId);
        if (gavelShownForSessionRef.current !== sessionKey) {
          const frozenName = previous.currentPlayer?.name;
          if (frozenName) {
            const winningTeam = (teams || []).find(
              t => t.id === current.highestBidderTeamId || t.name === current.highestBidderTeamName
            );
            gavelShownForSessionRef.current = sessionKey;
            if (gavelTimerRef.current) clearTimeout(gavelTimerRef.current);
            setSoldOverlay({
              sessionKey,
              verdict: 'SOLD',
              name: frozenName,
              team: current.highestBidderTeamName,
              teamLogo: winningTeam?.logoUrl ? resolveUrl(winningTeam.logoUrl) : null,
              amount: current.currentBid,
              squadPick: formatSquadPickLabel(winningTeam?.playerCount),
            });
            gavelTimerRef.current = setTimeout(() => {
              setSoldOverlay(null);
              gavelTimerRef.current = null;
            }, SOLD_DURATION_MS);
          }
        }
      } else if (current.status === 'UNSOLD') {
        const sessionKey = String(current.sessionId);
        if (gavelShownForSessionRef.current !== sessionKey) {
          const frozenName = previous.currentPlayer?.name;
          if (frozenName) {
            gavelShownForSessionRef.current = sessionKey;
            if (gavelTimerRef.current) clearTimeout(gavelTimerRef.current);
            setSoldOverlay({
              sessionKey,
              verdict: 'UNSOLD',
              name: frozenName,
            });
            gavelTimerRef.current = setTimeout(() => {
              setSoldOverlay(null);
              gavelTimerRef.current = null;
            }, UNSOLD_DURATION_MS);
          }
        }
      }
    }

    previousAuctionRef.current = current;
  }, [auction, teams]);

  useEffect(() => {
    if (!soldOverlay || soldOverlay.verdict !== 'SOLD' || soldOverlay.teamLogo) return;
    const winningTeam = (teams || []).find(t => t.name === soldOverlay.team);
    if (!winningTeam?.logoUrl) return;
    setSoldOverlay(current => current ? {
      ...current,
      teamLogo: resolveUrl(winningTeam.logoUrl),
      squadPick: current.squadPick || formatSquadPickLabel(winningTeam.playerCount),
    } : current);
  }, [teams, soldOverlay]);

  return soldOverlay;
}
