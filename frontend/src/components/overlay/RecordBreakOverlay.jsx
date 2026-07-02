import { useEffect, useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { playBassHit, playCelebration } from '../../utils/overlayAudio';
import styles from './RecordBreakOverlay.module.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const DURATION_MS = 4800;

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
    const steps = Math.min(40, Math.max(8, Math.round(diff / 1000)));
    return diff / steps;
  }, [amount, previousRecord]);

  useEffect(() => {
    const timers = [
      setTimeout(() => { setPhase(1); playBassHit(); }, 300),
      setTimeout(() => setPhase(2), 1100),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => { setPhase(4); playCelebration(); }, 3600),
      setTimeout(() => setPhase(5), 4200),
      setTimeout(() => onComplete?.(), DURATION_MS),
    ];
    const failSafe = setTimeout(() => onComplete?.(), DURATION_MS + 500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(failSafe);
    };
  }, [onComplete]);

  useEffect(() => {
    if (phase < 3) {
      setDisplayAmount(previousRecord);
      return undefined;
    }
    let current = previousRecord;
    const target = amount;
    const stepMs = Math.max(40, Math.floor(1100 / Math.max(8, Math.round((target - previousRecord) / Math.max(increment, 1)))));
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

      {phase >= 3 && (
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

      {phase >= 4 && (
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

      {phase >= 5 && (
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
