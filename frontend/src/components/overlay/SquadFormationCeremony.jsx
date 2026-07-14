import { memo, useEffect, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { resolveUrl } from '../../utils/resolveUrl';
import {
  computeFilledGridLayout,
  formatCompactPurse,
  formatPurse,
  squadProgress,
} from '../../utils/squadFormation';
import { formatCurrency } from '../../utils/formatters';
import styles from './SquadFormationCeremony.module.css';

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function AnimatedNumber({ value = 0, duration = 700, format = (v) => String(Math.round(v)) }) {
  const [display, setDisplay] = useState(Number(value) || 0);
  const fromRef = useRef(Number(value) || 0);
  const frameRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const from = fromRef.current;
    if (from === target) return undefined;

    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * easeOutCubic(progress);
      setDisplay(next);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else {
        fromRef.current = target;
        setDisplay(target);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration, format]);

  return <>{format(display)}</>;
}

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
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
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

const FilledPlayerCard = memo(function FilledPlayerCard({ player, isNew }) {
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
      </div>
    </article>
  );
});

function NextSigningSlot({ teamId, registerNextSlot, show }) {
  const slotRef = useRef(null);

  useEffect(() => {
    if (!registerNextSlot || !show) return undefined;
    registerNextSlot(teamId, slotRef.current);
    return () => registerNextSlot(teamId, null);
  }, [registerNextSlot, teamId, show]);

  if (!show) return null;

  return (
    <div ref={slotRef} className={styles.nextSlot} aria-label="Next squad slot">
      <div className={styles.nextSlotSilhouette} />
      <span>Add Player</span>
    </div>
  );
}

function SquadFlyCard({ player, fromRect, toRect, durationMs, onComplete }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !fromRect || !toRect || !player) return undefined;

    el.style.left = `${fromRect.left}px`;
    el.style.top = `${fromRect.top}px`;
    el.style.width = `${fromRect.width}px`;
    el.style.height = `${fromRect.height}px`;
    el.style.transform = 'translate(0, 0) scale(0.7) rotate(-2deg)';
    el.style.opacity = '1';

    const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
    const scale = Math.max(0.18, Math.min(toRect.width / fromRect.width, toRect.height / fromRect.height) * 0.95);

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale}) rotate(4deg)`;
        el.style.opacity = '0.95';
      });
    });

    const timer = setTimeout(() => onComplete?.(), durationMs);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [player, fromRect, toRect, durationMs, onComplete]);

  if (!player || !fromRect || !toRect) return null;

  const imageSrc = resolveImageSrc(player.imageUrl);

  return (
    <div className={styles.flyLayer} aria-hidden>
      <div
        ref={cardRef}
        className={styles.flyCard}
        style={{
          transition: `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${durationMs}ms ease`,
        }}
      >
        <div className={styles.flyPhoto}>
          {imageSrc ? <img src={imageSrc} alt="" /> : <UserRound size={72} />}
        </div>
        <div className={styles.flyMeta}>
          <span>{player.name}</span>
          {player.role ? <small>{player.role}</small> : null}
        </div>
      </div>
    </div>
  );
}

export default function SquadFormationCeremony({
  team,
  filledPlayers,
  squadSize,
  saleSummary,
  phase,
  newPlayerKey,
  flyRequest,
  flyDurationMs,
  exitDurationMs,
  registerNextSlot,
  sourceRef,
  onFlyComplete,
}) {
  const exiting = phase === 'exit';
  const visible = phase != null;
  const logoSrc = team?.logoUrl ? resolveUrl(team.logoUrl) : null;
  const { filled, total, remaining, percent } = squadProgress(filledPlayers.length, squadSize);
  const gridItems = filledPlayers.length + (remaining > 0 ? 1 : 0);
  const { cols: gridColumns, rows: gridRows, density } = computeFilledGridLayout(gridItems);
  const compactHeader = filled >= 5;
  const densityClass = {
    relaxed: styles.densityRelaxed,
    cozy: styles.densityCozy,
    compact: styles.densityCompact,
    dense: styles.densityDense,
  }[density];

  if (!team) return null;

  return (
    <div
      className={`${styles.ceremony} ${visible ? styles.ceremonyVisible : ''} ${exiting ? styles.ceremonyExit : ''} ${densityClass || ''}`}
      style={{
        '--exit-ms': `${exitDurationMs}ms`,
        '--grid-cols': gridColumns,
        '--grid-rows': gridRows,
      }}
      aria-hidden={!visible}
    >
      <div className={styles.backdrop} />
      <div ref={sourceRef} className={styles.flyOrigin} aria-hidden />

      <div className={styles.ceremonyBody}>
        <header className={`${styles.heroHeader} ${compactHeader ? styles.heroHeaderCompact : ''}`}>
          <p className={styles.ceremonyKicker}>Squad Formation</p>
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
              {saleSummary.amount != null && (
                <em>{formatCurrency(saleSummary.amount)}</em>
              )}
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
                <strong>
                  <AnimatedNumber value={team.remainingBudget} duration={700} format={formatCompactPurse} />
                </strong>
              </div>
              <div className={styles.summaryStatWide}>
                <span>Full Purse</span>
                <strong>
                  <AnimatedNumber value={team.remainingBudget} duration={700} format={formatPurse} />
                </strong>
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
                isNew={newPlayerKey === `${team.id}:${player.id}`}
              />
            ))}
            <NextSigningSlot
              teamId={team.id}
              registerNextSlot={registerNextSlot}
              show={remaining > 0}
            />
          </div>
        </section>
      </div>

      {flyRequest && (
        <SquadFlyCard
          player={flyRequest.player}
          fromRect={flyRequest.fromRect}
          toRect={flyRequest.toRect}
          durationMs={flyDurationMs}
          onComplete={onFlyComplete}
        />
      )}
    </div>
  );
}
