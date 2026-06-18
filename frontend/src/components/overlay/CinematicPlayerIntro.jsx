import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { resolveUrl } from '../../utils/resolveUrl';
import { driveImg } from '../../utils/driveImage';
import { formatRole } from '../../utils/formatters';
import styles from './CinematicPlayerIntro.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function CinematicPlayerIntro({ player, playerRoles, scene }) {
  const [activeScene, setActiveScene] = useState(1);
  const imageSrc = player?.imageUrl ? (driveImg(player.imageUrl) || resolveUrl(player.imageUrl)) : null;

  useEffect(() => {
    if (!scene) return undefined;
    setActiveScene(1);
    const t2 = setTimeout(() => setActiveScene(2), 400);
    const t3 = setTimeout(() => setActiveScene(3), 1000);
    const t4 = setTimeout(() => setActiveScene(4), 2000);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [scene, player?.id]);

  if (!scene) return null;

  return (
    <div className={`${styles.overlay} ${styles[`scene${activeScene}`]}`} aria-hidden="true">
      <div className={styles.backdrop} />
      <div className={styles.spotlight} />
      <div className={styles.particles} />
      <div className={styles.scanLine} />

      <div className={styles.nextPlayerBlock}>
        <div className={styles.rule} />
        <div className={styles.nextPlayerTitle}>Next Player</div>
        <div className={styles.rule} />
        <div className={styles.silhouette} />
      </div>

      <div className={styles.revealBlock}>
        <div className={styles.photoFrame}>
          {imageSrc ? (
            <img src={imageSrc} alt="" />
          ) : (
            <div className={styles.photoFallback}><UserRound size={80} /></div>
          )}
        </div>
        <div className={styles.playerName}>{player?.name || 'Player'}</div>
        <div className={styles.playerRole}>{formatRole(player?.role, playerRoles)}</div>
        <div className={styles.basePriceBlock}>
          <div className={styles.basePriceLabel}>Base Price</div>
          <div className={styles.basePriceValue}>{money(player?.basePrice)}</div>
        </div>
      </div>
    </div>
  );
}
