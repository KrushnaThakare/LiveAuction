import { useEffect, useMemo, useState } from 'react';
import { resolveUrl } from '../../utils/resolveUrl';
import {
  playCountdownAmbience,
  playCountdownPulse,
  playGoExplosion,
} from '../../utils/overlayAudio';
import styles from './TournamentCountdownOverlay.module.css';

const INTRO_MS = 4200;
const GO_MS = 1600;

export default function TournamentCountdownOverlay({
  tournamentName = 'Tournament',
  logoUrl,
  countdownSeconds = 5,
  onComplete,
}) {
  const [phase, setPhase] = useState('intro');
  const [count, setCount] = useState(countdownSeconds);
  const [goVisible, setGoVisible] = useState(false);
  const logoSrc = logoUrl ? resolveUrl(logoUrl) : null;
  const showLogo = Boolean(logoSrc) && !goVisible && phase !== 'count';

  const numbers = useMemo(() => {
    const n = Math.max(5, Math.min(15, countdownSeconds));
    return Array.from({ length: n }, (_, i) => n - i);
  }, [countdownSeconds]);

  useEffect(() => {
    playCountdownAmbience();
    const t1 = setTimeout(() => setPhase('welcome'), 400);
    const t2 = setTimeout(() => setPhase('logo'), 1800);
    const t3 = setTimeout(() => setPhase('begin'), 3200);
    const t4 = setTimeout(() => {
      setPhase('count');
      setCount(numbers[0]);
      playCountdownPulse();
    }, INTRO_MS);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [numbers]);

  useEffect(() => {
    const maxMs = INTRO_MS + numbers.length * 1000 + GO_MS + 2500;
    const failSafe = setTimeout(() => onComplete?.(), maxMs);
    return () => clearTimeout(failSafe);
  }, [numbers.length, onComplete]);

  useEffect(() => {
    if (phase !== 'count') return undefined;
    if (count <= 0) {
      setGoVisible(true);
      playGoExplosion();
      const done = setTimeout(() => onComplete?.(), GO_MS);
      return () => clearTimeout(done);
    }
    const idx = numbers.indexOf(count);
    const timer = setTimeout(() => {
      const next = numbers[idx + 1];
      if (next == null) {
        setCount(0);
        return;
      }
      setCount(next);
      playCountdownPulse();
    }, 1000);
    return () => clearTimeout(timer);
  }, [count, numbers, onComplete, phase]);

  return (
    <div className={`${styles.overlay} ${styles[phase]} ${goVisible ? styles.goPhase : ''}`} aria-hidden="true">
      <div className={styles.backdrop} />
      <div className={styles.particles} />
      <div className={styles.zoom} />

      <div className={styles.contentStack}>
        {(phase === 'intro' || phase === 'welcome' || phase === 'logo' || phase === 'begin' || phase === 'count' || goVisible) && (
          <header className={styles.welcomeBlock}>
            <div className={styles.welcomeKicker}>WELCOME TO</div>
            <div className={styles.tournamentName}>{tournamentName}</div>
          </header>
        )}

        {showLogo && (
          <div className={styles.logoBadge}>
            <div className={styles.logoGlow} />
            <img src={logoSrc} alt="" className={styles.logo} />
          </div>
        )}

        {(phase === 'begin' || phase === 'count') && !goVisible && (
          <div className={styles.beginText}>LET THE AUCTION BEGIN</div>
        )}

        {phase === 'count' && count > 0 && !goVisible && (
          <div key={count} className={styles.countBlock}>
            <div className={styles.countGlow} />
            <div className={styles.countNumber}>{count}</div>
            <div className={styles.countBurst} />
          </div>
        )}

        {goVisible && (
          <div className={styles.goBlock}>
            <div className={styles.goText}>GO!!</div>
            <div className={styles.goParticles}>
              {Array.from({ length: 24 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    left: `${10 + (i * 7) % 80}%`,
                    top: `${15 + (i * 11) % 70}%`,
                    background: i % 3 === 0 ? '#ffd76a' : i % 3 === 1 ? '#3b82f6' : '#fff',
                    animationDelay: `${(i % 5) * 0.05}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
