import { clampSquadSize } from './squadFormation';

/**
 * Live-bidding constraints: minimum purse reserve + squad completion.
 * Uses the current auction player's base price for reserve calculations.
 */
export function resolveAuctionBasePrice(auctionState) {
  const base = Number(auctionState?.currentPlayer?.basePrice);
  return Number.isFinite(base) && base > 0 ? base : 0;
}

export function maxAllowedBid(team, maxSquadSize, basePrice) {
  const squadSize = clampSquadSize(maxSquadSize);
  const playerCount = Number(team?.playerCount) || 0;
  const purse = Number(team?.remainingBudget) || 0;
  if (playerCount >= squadSize) return 0;
  const playersLeft = squadSize - playerCount;
  const slotsAfterPurchase = Math.max(0, playersLeft - 1);
  const minReserve = slotsAfterPurchase * Math.max(0, basePrice);
  return Math.max(0, purse - minReserve);
}

export function canTeamBid(team, bidAmount, maxSquadSize, basePrice) {
  const squadSize = clampSquadSize(maxSquadSize);
  const playerCount = Number(team?.playerCount) || 0;
  const purse = Number(team?.remainingBudget) || 0;
  const bid = Number(bidAmount) || 0;
  if (playerCount >= squadSize) return false;
  if (bid > purse) return false;
  return bid <= maxAllowedBid(team, squadSize, basePrice);
}

export function isSquadFull(team, maxSquadSize) {
  const squadSize = clampSquadSize(maxSquadSize);
  return (Number(team?.playerCount) || 0) >= squadSize;
}

/** Max bid hint for squad boards / exports when a live player is on the block. */
export function maxBidInfoForTeam(team, maxSquadSize, auctionState) {
  if (!team || auctionState?.status !== 'ACTIVE' || !auctionState?.currentPlayer) {
    return null;
  }
  const basePrice = resolveAuctionBasePrice(auctionState);
  const squadFull = isSquadFull(team, maxSquadSize);
  return {
    maxBid: maxAllowedBid(team, maxSquadSize, basePrice),
    squadFull,
    playerName: auctionState.currentPlayer.name,
  };
}
