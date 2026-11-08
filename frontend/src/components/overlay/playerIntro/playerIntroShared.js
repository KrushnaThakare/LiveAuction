import { resolveUrl } from '../../../utils/resolveUrl';
import { driveImg } from '../../../utils/driveImage';
import { formatRole } from '../../../utils/formatters';
import { playerIdLabel } from '../../../utils/playerSearch';
import { collectIntroDetailRows, parseIntroStudioConfig } from '../../../utils/overlayIntroStudio';

export function useIntroPresentationProps({
  player,
  config,
  sessionKey,
  exiting,
  studioOverride,
}) {
  const studio = studioOverride || parseIntroStudioConfig(config?.overlayMainIntroConfig);
  const detailHeaders = config?.overlayMainDetailFields || [];
  const rows = collectIntroDetailRows(player, studio, detailHeaders);
  const photoSrc = player?.imageUrl ? (driveImg(player.imageUrl) || resolveUrl(player.imageUrl)) : null;
  const speed = Math.max(0.5, Math.min(2, Number(studio.animationScale) || Number(studio.animationSpeed) || 1));
  const scale = Math.max(0.85, Math.min(1.15, Number(studio.introScalePercent || 100) / 100));
  const photoScale = Math.max(0.7, Math.min(1.3, Number(studio.photoScalePercent || 100) / 100));

  return {
    studio,
    player,
    rows,
    photoSrc,
    role: formatRole(player?.role, config?.playerRoles),
    playerId: player?.id ? playerIdLabel(player) : null,
    sessionKey,
    exiting,
    style: {
      '--intro-speed': `${1 / speed}s`,
      '--intro-scale': scale,
      '--intro-photo-scale': photoScale,
    },
    bgClass: studio.backgroundStyle || 'navy-gradient',
  };
}

export const moneyIntro = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
