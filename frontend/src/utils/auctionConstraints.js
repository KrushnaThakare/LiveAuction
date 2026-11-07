import { clampSquadSize } from './squadFormation';

/**
 * Live-bidding constraints: minimum purse reserve + squad completion.
 * Uses the current auction player's base price for reserve calculations.
 */
export function resolveAuctionBasePrice(auctionState) {
  const base = Number(auctionState?.currentPlayer?.basePrice);
  return Number.isFinite(base) && base > 0 ? base : 0;
}

/** Base price used for max-bid ribbon (live lot, sold/unsold holdover, or purse estimate). */
export function resolveMaxBidBasePrice(auctionState) {
  const fromPlayer = resolveAuctionBasePrice(auctionState);
  if (fromPlayer > 0) return fromPlayer;
  const fromBid = Number(auctionState?.currentBid);
  if (Number.isFinite(fromBid) && fromBid > 0) return fromBid;
  return 0;
}

function teamPlayerCount(team) {
  const n = Number(team?.playerCount);
  if (Number.isFinite(n) && n >= 0) return n;
  return Array.isArray(team?.players) ? team.players.length : 0;
}

export function maxAllowedBid(team, maxSquadSize, basePrice) {
  const squadSize = clampSquadSize(maxSquadSize);
  const playerCount = teamPlayerCount(team);
  const purse = Number(team?.remainingBudget) || 0;
  if (playerCount >= squadSize) return 0;
  const playersLeft = squadSize - playerCount;
  const slotsAfterPurchase = Math.max(0, playersLeft - 1);
  const minReserve = slotsAfterPurchase * Math.max(0, basePrice);
  return Math.max(0, purse - minReserve);
}

export function canTeamBid(team, bidAmount, maxSquadSize, basePrice) {
  const squadSize = clampSquadSize(maxSquadSize);
  const playerCount = teamPlayerCount(team);
  const purse = Number(team?.remainingBudget) || 0;
  const bid = Number(bidAmount) || 0;
  if (playerCount >= squadSize) return false;
  if (bid > purse) return false;
  return bid <= maxAllowedBid(team, squadSize, basePrice);
}

export function isSquadFull(team, maxSquadSize) {
  const squadSize = clampSquadSize(maxSquadSize);
  return teamPlayerCount(team) >= squadSize;
}

/** Max bid hint for squad boards, audience, and broadcaster /view (always shown when team exists). */
export function maxBidInfoForTeam(team, maxSquadSize, auctionState) {
  if (!team) return null;
  const basePrice = resolveMaxBidBasePrice(auctionState);
  const squadFull = isSquadFull(team, maxSquadSize);
  const rawName = auctionState?.currentPlayer?.name;
  const playerName = rawName ? (rawName.split(/\s+/)[0] || rawName) : null;
  return {
    maxBid: maxAllowedBid(team, maxSquadSize, basePrice),
    squadFull,
    playerName,
    basePrice,
    show: true,
  };
}
