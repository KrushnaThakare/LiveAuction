import { resolveUrl } from '../../../utils/resolveUrl';
import { driveImg } from '../../../utils/driveImage';
import { getRoleShortLabel } from '../../../utils/formatters';
import { parseMainOverlayFields } from '../../../utils/overlayMainFields';

export const moneyInr = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

export function resolvePlayerPhoto(player) {
  if (!player?.imageUrl) return null;
  return driveImg(player.imageUrl) || resolveUrl(player.imageUrl);
}

export function resolveTeamLogoSrc(team) {
  if (!team?.logoUrl) return null;
  return resolveUrl(team.logoUrl);
}

export function auctionStatusLabel(status, isSold, isUnsold) {
  if (isSold) return 'SOLD';
  if (isUnsold) return 'UNSOLD';
  if (status === 'ACTIVE') return 'LIVE';
  return status || 'IDLE';
}

export function pickMainFields(config) {
  return parseMainOverlayFields(config?.overlayMainShowFields);
}

export function playerRoleLabel(player, config) {
  return getRoleShortLabel(player?.role, config?.playerRoles);
}

export const LOWER_THIRD_PREMIUM_LAYOUTS = [
  {
    id: 'modern-3d-sports',
    label: 'Modern 3D Sports',
    subtitle: 'Gold & Navy',
    description: 'Metallic gold frames, hexagonal photo, premium tournament broadcast.',
    thumbClass: 'ltThumbGold',
  },
  {
    id: 'clean-premium-tv',
    label: 'Clean Premium',
    subtitle: 'TV Broadcast',
    description: 'Circular photo, dark gradient bar, refined red/gold accents.',
    thumbClass: 'ltThumbClean',
  },
  {
    id: 'dynamic-electric',
    label: 'Dynamic Broadcast',
    subtitle: 'Electric Blue',
    description: 'Cyan neon edges, angular frames, high-energy esports look.',
    thumbClass: 'ltThumbElectric',
  },
];

export const LOWER_THIRD_PREVIEW_SAMPLE = {
  auction: {
    status: 'ACTIVE',
    sessionId: 'studio-preview',
    currentBid: 27000,
    highestBidderTeamName: 'Sidharth Nagar Kings',
    highestBidderTeamId: 1,
  },
  player: {
    id: 101,
    name: 'Pankaj Patil',
    role: 'ALLROUNDER',
    basePrice: 5000,
    imageUrl: null,
  },
  team: {
    id: 1,
    name: 'Sidharth Nagar Kings',
    logoUrl: null,
  },
};
