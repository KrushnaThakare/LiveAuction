import { memo, useEffect, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { resolveUrl } from '../../utils/resolveUrl';
import { formatPurse } from '../../utils/squadFormation';
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

const SquadSlot = memo(function SquadSlot({
  player,
  slotIndex,
  teamId,
  isNew,
  registerSlot,
}) {
  const slotRef = useRef(null);

  useEffect(() => {
    if (!registerSlot) return undefined;
    registerSlot(teamId, slotIndex, slotRef.current);
    return () => registerSlot(teamId, slotIndex, null);
  }, [registerSlot, teamId, slotIndex]);

  if (!player) {
    return (
      <div ref={slotRef} className={styles.emptySlot} aria-hidden>
        <div className={styles.emptyJersey} />
      </div>
    );
  }

  const imageSrc = resolveImageSrc(player.imageUrl);

  return (
    <div
      ref={slotRef}
      className={`${styles.playerSlot} ${isNew ? styles.playerSlotNew : ''}`}
    >
      <div className={styles.slotPhoto}>
        {imageSrc ? (
          <img src={imageSrc} alt="" loading="lazy" />
        ) : (
          <span className={styles.slotPhotoFallback}><UserRound size={28} /></span>
        )}
      </div>
      <div className={styles.slotMeta}>
        <span className={styles.slotName}>{player.name}</span>
        {player.role ? <span className={styles.slotRole}>{player.role}</span> : null}
      </div>
    </div>
  );
});

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
  slots,
  saleSummary,
  phase,
  newPlayerKey,
  flyRequest,
  flyDurationMs,
  exitDurationMs,
  registerSlot,
  sourceRef,
  onFlyComplete,
}) {
  const exiting = phase === 'exit';
  const visible = phase != null;
  const logoSrc = team?.logoUrl ? resolveUrl(team.logoUrl) : null;
  const filledCount = slots.filter(Boolean).length;

  if (!team) return null;

  return (
    <div
      className={`${styles.ceremony} ${visible ? styles.ceremonyVisible : ''} ${exiting ? styles.ceremonyExit : ''}`}
      style={{ '--exit-ms': `${exitDurationMs}ms` }}
      aria-hidden={!visible}
    >
      <div className={styles.backdrop} />
      <div ref={sourceRef} className={styles.flyOrigin} aria-hidden />

      <div className={styles.ceremonyBody}>
        <header className={styles.heroHeader}>
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
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span>Players</span>
              <AnimatedNumber value={filledCount} duration={550} />
            </div>
            <div className={styles.heroStat}>
              <span>Remaining Budget</span>
              <AnimatedNumber value={team.remainingBudget} duration={700} format={formatPurse} />
            </div>
          </div>
        </header>

        <section className={styles.squadPanel}>
          <div className={styles.slotGrid}>
            {slots.map((player, index) => (
              <SquadSlot
                key={`${team.id}-${index}`}
                player={player}
                slotIndex={index}
                teamId={team.id}
                isNew={newPlayerKey === `${team.id}:${player?.id}`}
                registerSlot={registerSlot}
              />
            ))}
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
