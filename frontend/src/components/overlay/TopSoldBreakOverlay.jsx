import { useEffect, useState } from 'react';
import { Crown, UserRound } from 'lucide-react';
import { resolveUrl } from '../../utils/resolveUrl';
import { playBassHit, playCelebration } from '../../utils/overlayAudio';
import styles from './TopSoldBreakOverlay.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const RANK_LABELS = ['#1', '#2', '#3', '#4', '#5'];

export default function TopSoldBreakOverlay({
  players = [],
  tournamentName,
  logoUrl,
  onRevealComplete,
}) {
  const [phase, setPhase] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const list = players.slice(0, 5);

  useEffect(() => {
    setPhase(0);
    setVisibleCount(0);
    const timers = [
      setTimeout(() => { setPhase(1); playBassHit(); }, 400),
      setTimeout(() => setPhase(2), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [players]);

  useEffect(() => {
    if (phase < 2 || !list.length) return undefined;
    const timers = [];
    list.forEach((_, index) => {
      timers.push(setTimeout(() => {
        setVisibleCount(index + 1);
        if (index === 0) playCelebration();
        if (index === list.length - 1) onRevealComplete?.();
      }, index * 650));
    });
    return () => timers.forEach(clearTimeout);
  }, [phase, list, onRevealComplete]);

  return (
    <div className={`${styles.overlay} ${styles[`phase${phase}`]}`} aria-hidden="true">
      <div className={styles.backdrop} />
      <div className={styles.rays} />
      <div className={styles.particles} />
      <div className={styles.vignette} />

      {phase >= 1 && (
        <header className={styles.header}>
          {logoUrl && (
            <img src={resolveUrl(logoUrl)} alt="" className={styles.tournamentLogo} />
          )}
          <div className={styles.kicker}>AUCTION HIGHLIGHTS</div>
          <h1 className={styles.title}>Top 5 Highest Sales</h1>
          {tournamentName && <p className={styles.subtitle}>{tournamentName}</p>}
        </header>
      )}

      {phase >= 2 && (
        <div className={styles.grid}>
          {list.map((player, index) => {
            const rank = player.rank || index + 1;
            const isTop = rank === 1;
            const shown = index < visibleCount;
            return (
              <article
                key={player.playerId || `${player.playerName}-${index}`}
                className={`${styles.card} ${shown ? styles.cardIn : ''} ${isTop ? styles.cardTop : ''}`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className={styles.rankBadge}>
                  {isTop ? <Crown size={22} /> : RANK_LABELS[index] || `#${rank}`}
                </div>
                <div className={styles.photoWrap}>
                  {player.imageUrl ? (
                    <img src={resolveUrl(player.imageUrl)} alt="" className={styles.photo} />
                  ) : (
                    <div className={styles.photoFallback}><UserRound size={48} /></div>
                  )}
                  <div className={styles.photoGlow} />
                </div>
                <div className={styles.meta}>
                  <div className={styles.playerName}>{player.playerName}</div>
                  <div className={styles.teamRow}>
                    {player.teamLogoUrl ? (
                      <img src={resolveUrl(player.teamLogoUrl)} alt="" className={styles.teamLogo} />
                    ) : (
                      <span className={styles.teamDot}>{(player.teamName || '?')[0]}</span>
                    )}
                    <span className={styles.teamName}>{player.teamName || '—'}</span>
                  </div>
                  <div className={styles.amount}>{money(player.soldPrice)}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!list.length && phase >= 2 && (
        <div className={styles.empty}>No sold players yet</div>
      )}
    </div>
  );
}
