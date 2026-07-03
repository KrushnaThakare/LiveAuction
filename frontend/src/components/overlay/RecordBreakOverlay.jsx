import { useEffect, useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { RECORD_BREAK_MS } from '../../constants/recordBreakTiming';
import { playBassHit, playCelebration } from '../../utils/overlayAudio';
import styles from './RecordBreakOverlay.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function RecordBreakOverlay({
  name,
  team,
  teamLogo,
  amount = 0,
  previousRecord = 0,
  playerImageUrl,
  onComplete,
}) {
  const [phase, setPhase] = useState(0);
  const [displayAmount, setDisplayAmount] = useState(previousRecord);

  const increment = useMemo(() => {
    const diff = Math.max(0, amount - previousRecord);
    const steps = Math.min(50, Math.max(10, Math.round(diff / 500)));
    return diff / steps;
  }, [amount, previousRecord]);

  useEffect(() => {
    const { freeze, title, hero, sale, recordBar, celebration, complete } = RECORD_BREAK_MS;
    const timers = [
      setTimeout(() => { setPhase(1); playBassHit(); }, freeze),
      setTimeout(() => setPhase(2), title),
      setTimeout(() => setPhase(3), hero),
      setTimeout(() => setPhase(4), sale),
      setTimeout(() => { setPhase(5); playCelebration(); }, recordBar),
      setTimeout(() => setPhase(6), celebration),
      setTimeout(() => onComplete?.(), complete),
    ];
    const failSafe = setTimeout(() => onComplete?.(), complete + 800);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(failSafe);
    };
  }, [onComplete]);

  useEffect(() => {
    if (phase < 4) {
      setDisplayAmount(previousRecord);
      return undefined;
    }
    let current = previousRecord;
    const target = amount;
    const countWindowMs = RECORD_BREAK_MS.recordBar - RECORD_BREAK_MS.sale;
    const steps = Math.max(10, Math.round((target - previousRecord) / Math.max(increment, 1)));
    const stepMs = Math.max(55, Math.floor(countWindowMs / steps));
    const id = setInterval(() => {
      current = Math.min(target, current + increment);
      setDisplayAmount(current);
      if (current >= target) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [amount, increment, phase, previousRecord]);

  return (
    <div className={`${styles.overlay} ${styles[`phase${phase}`]}`} aria-hidden="true">
      <div className={styles.freeze} />
      <div className={styles.rays} />
      <div className={styles.flare} />
      <div className={styles.particles} />
      <div className={styles.confetti}>
        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${8 + (i * 5) % 84}%`,
              top: `${12 + (i * 7) % 40}%`,
              background: i % 2 ? '#ffd76a' : '#3b82f6',
              animationDelay: `${(i % 6) * 0.06}s`,
            }}
          />
        ))}
      </div>

      {phase >= 1 && (
        <div className={styles.titleBlock}>
          <div className={styles.titleGlow} />
          <h1 className={styles.title}>🏆 NEW AUCTION RECORD 🏆</h1>
        </div>
      )}

      <div className={styles.heroZone}>
        <div className={styles.heroGlow} />
        <div className={styles.heroFrame}>
          {playerImageUrl ? (
            <img src={playerImageUrl} alt="" className={styles.heroImage} />
          ) : (
            <div className={styles.heroFallback}><UserRound size={120} /></div>
          )}
        </div>
        <div className={styles.sparkles} />
      </div>

      {phase >= 4 && (
        <div className={styles.saleBlock}>
          <div className={styles.playerName}>{name}</div>
          <div className={styles.soldTo}>SOLD TO</div>
          <div className={styles.teamRow}>
            {teamLogo ? (
              <img src={teamLogo} alt="" className={styles.teamLogo} />
            ) : (
              <div className={styles.teamLogoFallback}>{(team || '?')[0]}</div>
            )}
            <span className={styles.teamName}>{team}</span>
          </div>
          <div className={styles.amount}>{money(displayAmount)}</div>
        </div>
      )}

      {phase >= 5 && (
        <div className={styles.recordBar}>
          <div className={styles.prevRecord}>
            <span>Previous Record</span>
            <strong>{money(previousRecord)}</strong>
          </div>
          <div className={styles.newRecord}>
            <span>NEW RECORD</span>
            <strong>{money(amount)}</strong>
          </div>
        </div>
      )}

      {phase >= 6 && (
        <>
          <div className={styles.flashBurst} />
          <div className={styles.fireworks}>
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                style={{
                  left: `${15 + (i * 11) % 70}%`,
                  top: `${20 + (i * 9) % 50}%`,
                  background: i % 3 === 0 ? '#fff' : '#ffd76a',
                  animationDelay: `${(i % 4) * 0.08}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
