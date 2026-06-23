import { memo } from 'react';
import { UserRound } from 'lucide-react';
import { resolveUrl } from '../../utils/resolveUrl';
import { formatCurrency } from '../../utils/formatters';
import {
  computeFilledGridLayout,
  formatCompactPurse,
  formatPurse,
  squadProgress,
} from '../../utils/squadFormation';
import styles from './SquadFormationCeremony.module.css';

function resolveImageSrc(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) return imageUrl;
  return resolveUrl(imageUrl);
}

function ProgressRing({ filled, total, percent }) {
  const radius = 54;
  const stroke = 8;
  const normalized = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalized;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={styles.progressRing} aria-hidden>
      <svg viewBox="0 0 120 120">
        <circle className={styles.ringTrack} cx="60" cy="60" r={normalized} />
        <circle
          className={styles.ringValue}
          cx="60"
          cy="60"
          r={normalized}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <div className={styles.ringLabel}>
        <strong>{percent}%</strong>
        <span>{filled}/{total}</span>
      </div>
    </div>
  );
}

function SquadProgressBar({ filled, total, remaining, compact }) {
  const blocks = Array.from({ length: total }, (_, index) => index < filled);
  return (
    <div className={`${styles.progressBlockWrap} ${compact ? styles.progressBlockCompact : ''}`}>
      <div className={styles.progressBlockMeta}>
        <span>{filled} Filled</span>
        <span>{remaining} Remaining</span>
      </div>
      <div className={styles.progressBlocks} aria-hidden>
        {blocks.map((on, index) => (
          <span key={index} className={on ? styles.blockFilled : styles.blockEmpty} />
        ))}
      </div>
      <div className={styles.progressFraction}>{filled} / {total}</div>
    </div>
  );
}

const FilledPlayerCard = memo(function FilledPlayerCard({ player, isNew, showPrices }) {
  const imageSrc = resolveImageSrc(player.imageUrl);
  return (
    <article className={`${styles.filledCard} ${isNew ? styles.filledCardNew : ''}`}>
      <div className={styles.filledPhoto}>
        {imageSrc ? (
          <img src={imageSrc} alt="" loading="lazy" />
        ) : (
          <span className={styles.filledPhotoFallback}><UserRound size={36} /></span>
        )}
      </div>
      <div className={styles.filledMeta}>
        <span className={styles.filledName}>{player.name}</span>
        {player.role ? <span className={styles.filledRole}>{player.role}</span> : null}
        {showPrices && player.soldPrice != null ? (
          <span className={styles.filledPrice}>{formatCurrency(player.soldPrice)}</span>
        ) : null}
      </div>
    </article>
  );
});

export default function SquadBoardPanel({
  team,
  filledPlayers = [],
  squadSize,
  showPrices = false,
  newPlayerKey = null,
  showNextSlot = true,
  kicker = 'Squad Formation',
  saleSummary = null,
  className = '',
}) {
  if (!team) return null;

  const logoSrc = team.logoUrl ? resolveUrl(team.logoUrl) : null;
  const { filled, total, remaining, percent } = squadProgress(filledPlayers.length, squadSize);
  const gridItems = filledPlayers.length + (showNextSlot && remaining > 0 ? 1 : 0);
  const { cols: gridColumns, rows: gridRows, density } = computeFilledGridLayout(gridItems);
  const compactHeader = filled >= 5;
  const densityClass = {
    relaxed: styles.densityRelaxed,
    cozy: styles.densityCozy,
    compact: styles.densityCompact,
    dense: styles.densityDense,
  }[density];

  return (
    <div
      className={`${styles.boardRoot} ${densityClass || ''} ${className}`}
      style={{ '--grid-cols': gridColumns, '--grid-rows': gridRows }}
    >
      <header className={`${styles.heroHeader} ${compactHeader ? styles.heroHeaderCompact : ''}`}>
        <p className={styles.ceremonyKicker}>{kicker}</p>
        <div className={styles.heroLogoWrap}>
          <div className={styles.heroGlow} />
          {logoSrc ? (
            <img src={logoSrc} alt="" className={styles.heroLogo} />
          ) : (
            <span className={styles.heroLogoFallback}>{team.name?.[0] || 'T'}</span>
          )}
        </div>
        <h2 className={styles.heroTeamName}>{team.name}</h2>
        {saleSummary?.name && (
          <p className={styles.signingLine}>
            <span>New Signing</span>
            <strong>{saleSummary.name}</strong>
            {saleSummary.amount != null && <em>{formatCurrency(saleSummary.amount)}</em>}
          </p>
        )}

        <div className={styles.summaryRow}>
          <ProgressRing filled={filled} total={total} percent={percent} />
          <div className={styles.summaryStats}>
            <div className={styles.summaryStat}>
              <span>Players</span>
              <strong>{filled} / {total}</strong>
            </div>
            <div className={styles.summaryStat}>
              <span>Remaining</span>
              <strong>{remaining} Players</strong>
            </div>
            <div className={styles.summaryStat}>
              <span>Budget Left</span>
              <strong>{formatCompactPurse(team.remainingBudget)}</strong>
            </div>
            <div className={styles.summaryStatWide}>
              <span>Full Purse</span>
              <strong>{formatPurse(team.remainingBudget)}</strong>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.squadPanel}>
        <SquadProgressBar filled={filled} total={total} remaining={remaining} compact={compactHeader} />
        <div className={styles.filledGrid}>
          {filledPlayers.map((player) => (
            <FilledPlayerCard
              key={player.id}
              player={player}
              showPrices={showPrices}
              isNew={newPlayerKey === `${team.id}:${player.id}`}
            />
          ))}
          {showNextSlot && remaining > 0 && (
            <div className={styles.nextSlot} aria-hidden>
              <div className={styles.nextSlotSilhouette} />
              <span>Open Slot</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
