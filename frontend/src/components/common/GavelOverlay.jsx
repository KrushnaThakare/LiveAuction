import { useEffect, useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Cinematic gavel overlay for SOLD and UNSOLD verdicts.
 * Used in both admin AuctionPage and public PublicViewPage.
 *
 * Props:
 *   verdict   'SOLD' | 'UNSOLD'
 *   name      player name
 *   team      team name (only for SOLD)
 *   teamLogo  absolute URL of team logo (only for SOLD)
 *   amount    final bid amount (only for SOLD)
 *   onDone    called when the overlay finishes (parent clears state)
 */
export default function GavelOverlay({ verdict, name, team, teamLogo, amount, duration = 5000 }) {
  const isSold = verdict === 'SOLD';
  const [phase, setPhase] = useState('entry'); // entry → impact → reveal → exit

  useEffect(() => {
    // Impact flash at 500ms
    const t1 = setTimeout(() => setPhase('impact'),  500);
    // Reveal details at 900ms
    const t2 = setTimeout(() => setPhase('reveal'),  900);
    // Start exit fade slightly before onDone
    const t3 = setTimeout(() => setPhase('exit'), duration - 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration]);

  const bgColor    = isSold ? 'rgba(0,10,0,0.94)' : 'rgba(10,0,0,0.94)';
  const accentHex  = isSold ? '#10b981' : '#ef4444';
  const accentRgb  = isSold ? '16,185,129' : '239,68,68';
  const verdictTxt = isSold ? 'SOLD!' : 'UNSOLD';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: bgColor,
        backdropFilter: 'blur(16px)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.6s ease-out' : 'opacity 0.3s ease-in',
      }}
    >
      {/* Background radial pulse */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${accentHex}18 0%, transparent 65%)`,
          opacity: phase === 'impact' ? 1 : phase === 'reveal' ? 0.5 : 0,
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Ripple rings on impact */}
      {phase !== 'entry' && [1, 1.6, 2.2].map((delay, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 80, height: 80,
            border: `2px solid ${accentHex}`,
            animation: `gavelRipple 0.9s ease-out ${delay * 0.15}s forwards`,
            opacity: 0,
          }}
        />
      ))}

      {/* ── GAVEL ── */}
      <div className="relative flex items-end justify-center mb-2" style={{ width: 140, height: 140 }}>
        {/* Sound board */}
        <div
          className={phase !== 'entry' ? 'animate-board-shake' : ''}
          style={{
            position: 'absolute',
            bottom: 0,
            width: 100,
            height: 18,
            borderRadius: 4,
            background: `linear-gradient(135deg, ${accentHex}cc, ${accentHex}66)`,
            boxShadow: phase !== 'entry' ? `0 0 24px ${accentHex}99, 0 0 60px ${accentHex}44` : 'none',
            transition: 'box-shadow 0.2s ease',
          }}
        />

        {/* Gavel handle + head */}
        <div
          className={phase === 'entry' ? 'animate-gavel-swing' : ''}
          style={{
            position: 'absolute',
            bottom: 14,
            right: 8,
            width: 12,
            height: 80,
            transformOrigin: 'top right',
            transform: phase === 'entry' ? 'rotate(-55deg)' : 'rotate(10deg)',
            transition: phase !== 'entry' ? 'transform 0.1s ease-out' : 'none',
          }}
        >
          {/* Handle */}
          <div style={{
            width: 10,
            height: 68,
            borderRadius: 5,
            background: 'linear-gradient(to bottom, #a16207, #78350f)',
            boxShadow: '1px 1px 4px rgba(0,0,0,0.5)',
          }} />
          {/* Head */}
          <div style={{
            position: 'absolute',
            top: -4,
            left: -14,
            width: 38,
            height: 20,
            borderRadius: 4,
            background: `linear-gradient(135deg, #d4d4d4, #737373)`,
            boxShadow: '2px 2px 6px rgba(0,0,0,0.6)',
          }} />
        </div>

        {/* Impact flash splat */}
        {phase !== 'entry' && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              width: 60,
              height: 12,
              borderRadius: '50%',
              background: `radial-gradient(ellipse, ${accentHex}ff 0%, ${accentHex}00 70%)`,
              animation: 'gavelImpact 0.5s ease-out forwards',
              opacity: 0,
            }}
          />
        )}
      </div>

      {/* ── VERDICT TEXT ── */}
      {phase !== 'entry' && (
        <div className="text-center relative z-10 px-4">
          {/* Main verdict word */}
          <div className="animate-verdict-slam font-black uppercase tracking-widest"
            style={{
              fontSize: 'clamp(3rem, 11vw, 7rem)',
              color: accentHex,
              textShadow: `0 0 30px ${accentHex}cc, 0 0 60px ${accentHex}66`,
              letterSpacing: '0.06em',
            }}>
            {verdictTxt}
          </div>

          {/* Player name */}
          {phase === 'reveal' && (
            <div className="animate-detail-up font-black"
              style={{ color: 'white', fontSize: 'clamp(1.4rem, 4.5vw, 2.8rem)',
                       marginTop: '0.3em', animationDelay: '0s' }}>
              {name}
            </div>
          )}

          {/* SOLD details: team + price */}
          {phase === 'reveal' && isSold && (
            <div className="animate-detail-up flex flex-col items-center gap-2 mt-4"
              style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              {teamLogo && (
                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl"
                  style={{ border: `3px solid ${accentHex}`, boxShadow: `0 0 32px ${accentHex}88` }}>
                  <img src={teamLogo} alt={team} className="w-full h-full object-cover" />
                </div>
              )}
              <p className="font-bold" style={{ color: '#fbbf24', fontSize: 'clamp(1.2rem,3.5vw,2rem)' }}>
                {team}
              </p>
              <p className="font-black" style={{ color: accentHex, fontSize: 'clamp(1.5rem,4vw,2.5rem)',
                textShadow: `0 0 20px ${accentHex}88` }}>
                {formatCurrency(amount)}
              </p>
            </div>
          )}

          {/* UNSOLD details */}
          {phase === 'reveal' && !isSold && (
            <div className="animate-detail-up mt-3" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <p className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Will go to re-auction
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
