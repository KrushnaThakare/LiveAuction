import { IndianRupee, Shield, UserRound } from 'lucide-react';
import { resolveUrl } from '../../utils/resolveUrl';
import { driveImg } from '../../utils/driveImage';
import { playerIdLabel } from '../../utils/playerSearch';
import { getRoleShortLabel } from '../../utils/formatters';
import { MAIN_OVERLAY_STAT_SLOTS, buildDetailSlotDefs, resolvePlayerDetailSlots } from '../../utils/playerDisplayExtras';
import styles from '../../pages/OverlayBroadcast.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function MainPlayerIntroOverlay({
  player,
  playerRoles,
  detailFields,
  sessionKey,
}) {
  if (!player) return null;

  const imageSrc = player.imageUrl ? (driveImg(player.imageUrl) || resolveUrl(player.imageUrl)) : null;
  const [detailA, detailB] = resolvePlayerDetailSlots(
    player,
    buildDetailSlotDefs(detailFields, MAIN_OVERLAY_STAT_SLOTS),
  );

  return (
    <div className={styles.mainIntroOverlay} key={sessionKey} aria-live="polite">
      <div className={styles.mainIntroGlow} aria-hidden />
      <div className={styles.mainIntroCard}>
        <div className={styles.mainIntroPhotoWrap}>
          {imageSrc ? (
            <img className={styles.mainIntroPhoto} src={imageSrc} alt="" />
          ) : (
            <div className={styles.mainIntroPhotoFallback}><UserRound size={72} /></div>
          )}
        </div>
        <div className={styles.mainIntroBody}>
          <div className={styles.mainIntroEyebrow}>
            Next player · {player?.id ? playerIdLabel(player) : '—'}
          </div>
          <h2 className={styles.mainIntroName}>{player.name || 'Player'}</h2>
          <div className={styles.mainIntroMetaRow}>
            <span className={styles.mainIntroPill}>
              <Shield size={14} />
              {getRoleShortLabel(player.role, playerRoles)}
            </span>
            <span className={styles.mainIntroPill}>
              <IndianRupee size={14} />
              Base {money(player.basePrice)}
            </span>
          </div>
          <div className={styles.mainIntroDetails}>
            <div className={styles.mainIntroDetailCell}>
              <span>{detailA.label}</span>
              <strong title={detailA.value}>{detailA.value}</strong>
            </div>
            <div className={styles.mainIntroDetailCell}>
              <span>{detailB.label}</span>
              <strong title={detailB.value}>{detailB.value}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
