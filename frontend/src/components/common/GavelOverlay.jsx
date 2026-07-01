import { useEffect, useState } from 'react';
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
 *   squadPick squad position label e.g. "10th Player" (SOLD only)
 *   duration  total display time in ms (default 5500)
 *   onComplete optional callback when overlay finishes
 */
export default function GavelOverlay({ verdict, name, team, teamLogo, amount, squadPick, duration = 5500, onComplete }) {
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
    const t6 = setTimeout(() => onComplete?.(), duration);

    return () => [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
  }, [duration, onComplete]);

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

        {/* SOLD details — grand team reveal */}
        {showDetails && isSold && (
          <div
            className="animate-detail-up"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 18, marginTop: 20,
              animationDelay: '0.12s',
              animationFillMode: 'both',
            }}
          >
            {/* Confetti burst */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
              {[
                { left: '18%', top: '22%', dx: '-80px', dy: '120px', color: '#fbbf24', delay: 0 },
                { left: '82%', top: '24%', dx: '90px',  dy: '140px', color: accent,    delay: 0.05 },
                { left: '12%', top: '48%', dx: '-60px', dy: '100px', color: '#fff',    delay: 0.1 },
                { left: '88%', top: '50%', dx: '70px',  dy: '110px', color: '#fbbf24', delay: 0.08 },
                { left: '28%', top: '18%', dx: '-40px', dy: '160px', color: accent,    delay: 0.15 },
                { left: '72%', top: '20%', dx: '50px',  dy: '150px', color: '#fff',    delay: 0.12 },
                { left: '50%', top: '14%', dx: '0px',   dy: '180px', color: '#fbbf24', delay: 0.06 },
                { left: '38%', top: '62%', dx: '-100px',dy: '80px',  color: accent,    delay: 0.18 },
                { left: '62%', top: '60%', dx: '100px', dy: '90px',  color: '#fbbf24', delay: 0.14 },
                { left: '8%',  top: '35%', dx: '-110px',dy: '130px', color: '#fff',    delay: 0.2 },
                { left: '92%', top: '38%', dx: '110px', dy: '125px', color: accent,    delay: 0.16 },
                { left: '50%', top: '70%', dx: '20px',  dy: '60px',  color: '#fbbf24', delay: 0.22 },
              ].map((p, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: p.left,
                    top: p.top,
                    width: i % 3 === 0 ? 10 : 7,
                    height: i % 3 === 0 ? 10 : 7,
                    borderRadius: i % 2 === 0 ? '50%' : 2,
                    background: p.color,
                    boxShadow: `0 0 10px ${p.color}`,
                    ['--dx']: p.dx,
                    ['--dy']: p.dy,
                    animation: `confettiBurst 1.4s ease-out ${p.delay + 0.9}s forwards`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>

            {/* Team logo hero */}
            <div style={{ position: 'relative', zIndex: 2, marginTop: 8 }}>
              {/* Pulsing glow halo */}
              <div style={{
                position: 'absolute',
                inset: '-18%',
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(${accentRgb},0.45) 0%, rgba(${accentRgb},0) 70%)`,
                animation: 'logoGlowPulse 2.4s ease-in-out infinite',
                pointerEvents: 'none',
              }} />

              {/* Rotating ring */}
              <div
                className="animate-team-logo"
                style={{
                  position: 'relative',
                  width: 'clamp(148px, 30vw, 240px)',
                  height: 'clamp(148px, 30vw, 240px)',
                  borderRadius: '50%',
                  padding: 5,
                  background: `conic-gradient(from 0deg, ${accent}, #fbbf24, #fff, ${accent})`,
                  boxShadow: `0 0 50px rgba(${accentRgb},0.55), 0 0 100px rgba(${accentRgb},0.25)`,
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  background: `conic-gradient(from 0deg, transparent, rgba(${accentRgb},0.35), transparent, rgba(251,191,36,0.35), transparent)`,
                  animation: 'logoRingSpin 4s linear infinite',
                  pointerEvents: 'none',
                }} />

                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.35)',
                  border: '4px solid rgba(255,255,255,0.22)',
                  boxShadow: 'inset 0 0 30px rgba(0,0,0,0.45)',
                }}>
                  {teamLogo ? (
                    <img
                      src={teamLogo}
                      alt={team}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'grid', placeItems: 'center',
                      fontSize: 'clamp(3rem, 10vw, 5rem)',
                      fontWeight: 900, color: '#fbbf24',
                    }}>
                      {(team || '?')[0]}
                    </div>
                  )}

                  {/* Shine sweep */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)',
                    animation: 'logoShineSweep 1.8s ease-in-out 1.1s forwards',
                    pointerEvents: 'none',
                  }} />
                </div>
              </div>

              {/* Trophy badge */}
              <div style={{
                position: 'absolute',
                bottom: -6,
                right: -6,
                width: 'clamp(42px, 8vw, 56px)',
                height: 'clamp(42px, 8vw, 56px)',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                border: '3px solid rgba(255,255,255,0.85)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
                boxShadow: '0 4px 20px rgba(251,191,36,0.6)',
                animation: 'teamLogoReveal 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.5s both',
              }}>
                🏆
              </div>
            </div>

            <p
              className="animate-team-name"
              style={{
                position: 'relative', zIndex: 2,
                fontWeight: 900,
                fontSize: 'clamp(1.5rem, 5.5vw, 2.8rem)',
                color: '#fbbf24',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              {team}
            </p>

            {squadPick && (
              <p
                className="animate-detail-up"
                style={{
                  position: 'relative', zIndex: 2,
                  fontWeight: 900,
                  fontSize: 'clamp(1rem, 3.2vw, 1.6rem)',
                  color: '#ffffff',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  margin: '4px 0 0',
                  textShadow: `0 0 20px rgba(${accentRgb},0.45)`,
                  animationDelay: '0.22s',
                  animationFillMode: 'both',
                }}
              >
                {squadPick} in Squad
              </p>
            )}

            <p
              className="animate-amount-pop"
              style={{
                position: 'relative', zIndex: 2,
                fontWeight: 900,
                fontSize: 'clamp(1.8rem, 6vw, 3.2rem)',
                color: accent,
                textShadow: `0 0 30px rgba(${accentRgb},0.7), 0 0 60px rgba(${accentRgb},0.3)`,
                margin: 0,
                animationDelay: '0.35s',
                animationFillMode: 'both',
              }}
            >
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
