import { useEffect, useState, useRef } from 'react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Cinematic gavel overlay — uses the real gavel PNG image.
 *
 * Animation timeline:
 *   0ms    — Overlay fades in, gavel already raised (pre-cocked position)
 *   100ms  — Gavel strikes down fast (gavelStrike)
 *   650ms  — Impact flash + ripple rings burst from contact point
 *   800ms  — Verdict text slams in (verdictSlam)
 *   1100ms — Player name + details slide up
 *   duration-600ms — Overlay starts fading out
 *
 * Props:
 *   verdict   'SOLD' | 'UNSOLD'
 *   name      player name
 *   team      winning team name (SOLD only)
 *   teamLogo  absolute URL of team logo (SOLD only)
 *   amount    final bid amount (SOLD only)
 *   duration  total display time in ms (default 5500)
 */
export default function GavelOverlay({ verdict, name, team, teamLogo, amount, duration = 5500 }) {
  const isSold = verdict === 'SOLD';

  // Colour scheme
  const accent    = isSold ? '#10b981' : '#ef4444';
  const accentRgb = isSold ? '16,185,129' : '239,68,68';
  const bg        = isSold
    ? 'radial-gradient(ellipse at center, rgba(0,30,15,0.97) 0%, rgba(0,8,4,0.98) 100%)'
    : 'radial-gradient(ellipse at center, rgba(30,0,0,0.97) 0%, rgba(8,0,0,0.98) 100%)';

  // Phase states
  const [phase, setPhase]         = useState('raise');   // raise → strike → verdict → details → exit
  const [showRipple, setRipple]   = useState(false);
  const [showVerdict, setVerdict] = useState(false);
  const [showDetails, setDetails] = useState(false);
  const [exiting, setExiting]     = useState(false);

  useEffect(() => {
    // 100ms: gavel swings down
    const t1 = setTimeout(() => setPhase('strike'), 100);
    // 650ms: impact effects
    const t2 = setTimeout(() => { setRipple(true);   setPhase('impact'); },  650);
    // 800ms: verdict text
    const t3 = setTimeout(() => setVerdict(true), 850);
    // 1200ms: player name + details
    const t4 = setTimeout(() => setDetails(true), 1200);
    // near end: start fade
    const t5 = setTimeout(() => setExiting(true), duration - 600);

    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, [duration]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: bg,
        backdropFilter: 'blur(14px)',
        opacity: exiting ? 0 : 1,
        transition: exiting ? 'opacity 0.6s ease-out' : 'opacity 0.25s ease-in',
        animation: 'overlayFadeIn 0.25s ease-in forwards',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow blob */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 60% 40% at 50% 60%, rgba(${accentRgb},0.12) 0%, transparent 70%)`,
        transition: 'opacity 0.4s',
        opacity: showRipple ? 1 : 0,
      }} />

      {/* ── GAVEL IMAGE ──────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        width: 'min(260px,50vw)',
        height: 'min(260px,50vw)',
        marginBottom: '-8px',
        zIndex: 2,
      }}>
        <img
          src="/gavel.png"
          alt="Gavel"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transformOrigin: '75% 80%',   // pivot near the base contact point
            animation: phase === 'raise'
              ? 'gavelRaise 0.12s ease-out forwards'
              : phase === 'strike' || phase === 'impact'
              ? 'gavelStrike 0.45s cubic-bezier(0.55,0,1,0.45) forwards'
              : 'none',
            filter: `drop-shadow(0 8px 24px rgba(${accentRgb},${showRipple ? 0.5 : 0.1}))`,
            transition: 'filter 0.3s ease',
          }}
        />

        {/* Impact burst — appears at the base contact point */}
        {showRipple && (
          <>
            {/* Starburst flash */}
            <div style={{
              position: 'absolute',
              bottom: '12%', left: '50%',
              transform: 'translateX(-50%)',
              width: 60, height: 60,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(${accentRgb},1) 0%, rgba(${accentRgb},0) 70%)`,
              animation: 'impactFlash 0.55s ease-out forwards',
              zIndex: 3,
            }} />
            {/* Ripple rings */}
            {[0, 0.12, 0.24].map((delay, i) => (
              <div key={i} style={{
                position: 'absolute',
                bottom: '14%', left: '50%',
                transform: 'translateX(-50%)',
                width: 50, height: 50,
                borderRadius: '50%',
                border: `2.5px solid rgba(${accentRgb},0.8)`,
                animation: `impactRipple 0.7s ease-out ${delay}s forwards`,
                opacity: 0,
                zIndex: 3,
              }} />
            ))}
          </>
        )}
      </div>

      {/* ── VERDICT TEXT ────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 4, textAlign: 'center', padding: '0 20px' }}>

        {showVerdict && (
          <div
            className="animate-verdict-slam"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(3.5rem, 13vw, 8rem)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: accent,
              textShadow: `0 0 40px rgba(${accentRgb},0.8), 0 0 80px rgba(${accentRgb},0.4), 0 4px 0 rgba(0,0,0,0.5)`,
              lineHeight: 1,
            }}
          >
            {isSold ? 'SOLD!' : 'UNSOLD'}
          </div>
        )}

        {/* Player name */}
        {showDetails && (
          <div
            className="animate-detail-up"
            style={{
              fontWeight: 900,
              fontSize: 'clamp(1.4rem, 5vw, 3rem)',
              color: 'white',
              marginTop: '0.3em',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              animationDelay: '0s',
              animationFillMode: 'both',
            }}
          >
            {name}
          </div>
        )}

        {/* SOLD details */}
        {showDetails && isSold && (
          <div
            className="animate-detail-up"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 12, marginTop: 16,
              animationDelay: '0.12s',
              animationFillMode: 'both',
            }}
          >
            {teamLogo && (
              <div style={{
                width: 'clamp(64px,12vw,88px)',
                height: 'clamp(64px,12vw,88px)',
                borderRadius: 16,
                overflow: 'hidden',
                border: `3px solid ${accent}`,
                boxShadow: `0 0 28px rgba(${accentRgb},0.6), 0 0 60px rgba(${accentRgb},0.25)`,
              }}>
                <img src={teamLogo} alt={team}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <p style={{
              fontWeight: 800,
              fontSize: 'clamp(1.2rem, 4vw, 2rem)',
              color: '#fbbf24',
              textShadow: '0 0 20px rgba(251,191,36,0.5)',
            }}>
              {team}
            </p>
            <p style={{
              fontWeight: 900,
              fontSize: 'clamp(1.5rem, 5vw, 2.8rem)',
              color: accent,
              textShadow: `0 0 24px rgba(${accentRgb},0.6)`,
            }}>
              {formatCurrency(amount)}
            </p>
          </div>
        )}

        {/* UNSOLD subtitle */}
        {showDetails && !isSold && (
          <div
            className="animate-detail-up"
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 500,
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
              marginTop: '0.6em',
              animationDelay: '0.1s',
              animationFillMode: 'both',
            }}
          >
            Will go to re-auction
          </div>
        )}
      </div>
    </div>
  );
}
