import { useEffect, useRef, useState } from 'react';
import { resolveUrl } from '../utils/resolveUrl';
import { driveImg } from '../utils/driveImage';
import { formatSquadPickLabel } from '../utils/formatters';

const UNSOLD_DURATION_MS = 4200;

function resolveSoldRecord(current, previous) {
  if (current?.highestSoldRecord === true) {
    return {
      isRecord: true,
      previousRecord: Number(current.previousHighestSoldBid) || 0,
    };
  }
  const amount = Number(current?.currentBid) || 0;
  const previousHighest = Number(previous?.tournamentHighestSoldBid) || 0;
  if (amount > previousHighest) {
    return { isRecord: true, previousRecord: previousHighest };
  }
  return { isRecord: false, previousRecord: 0 };
}

/**
 * Shows the gavel overlay once per closed auction session.
 * SOLD overlays persist until dismissOverlay() — parent chains record-break → gavel → ceremony.
 */
export function useAuctionVerdictOverlay(auction, teams) {
  const [soldOverlay, setSoldOverlay] = useState(null);
  const previousAuctionRef = useRef(null);
  const gavelShownForSessionRef = useRef(null);
  const gavelTimerRef = useRef(null);

  const dismissOverlay = () => setSoldOverlay(null);

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
            const { isRecord, previousRecord } = resolveSoldRecord(current, previous);
            gavelShownForSessionRef.current = sessionKey;
            if (gavelTimerRef.current) clearTimeout(gavelTimerRef.current);
            const frozenPlayer = previous.currentPlayer;
            setSoldOverlay({
              sessionKey,
              verdict: 'SOLD',
              name: frozenName,
              team: current.highestBidderTeamName,
              teamId: current.highestBidderTeamId ?? winningTeam?.id ?? null,
              teamLogo: winningTeam?.logoUrl ? resolveUrl(winningTeam.logoUrl) : null,
              amount: current.currentBid,
              squadPick: formatSquadPickLabel(winningTeam?.playerCount),
              playerId: frozenPlayer?.id ?? null,
              playerImageUrl: frozenPlayer?.imageUrl
                ? (driveImg(frozenPlayer.imageUrl) || resolveUrl(frozenPlayer.imageUrl))
                : null,
              playerRole: frozenPlayer?.role ?? null,
              isRecord,
              previousRecord,
            });
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
    if (!soldOverlay || soldOverlay.verdict !== 'SOLD' || soldOverlay.isRecord) return;
    if (!auction || auction.status !== 'SOLD') return;
    if (String(auction.sessionId) !== soldOverlay.sessionKey) return;
    if (auction.highestSoldRecord !== true) return;

    setSoldOverlay((current) => current ? {
      ...current,
      isRecord: true,
      previousRecord: Number(auction.previousHighestSoldBid) || current.previousRecord || 0,
    } : current);
  }, [auction, soldOverlay]);

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

  return { soldOverlay, dismissOverlay };
}
