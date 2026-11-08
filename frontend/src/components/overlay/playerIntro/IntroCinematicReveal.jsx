import { Shield, UserRound } from 'lucide-react';
import { useIntroPresentationProps, moneyIntro } from './playerIntroShared';
import s from './IntroCinematicReveal.module.css';

export default function IntroCinematicReveal({ player, config, sessionKey, exiting, studioOverride }) {
  const {
    studio, rows, photoSrc, role, style, bgClass,
  } = useIntroPresentationProps({ player, config, sessionKey, exiting, studioOverride });

  const bgMap = { none: s.bgNone, 'navy-gradient': s.bgNavy, spotlight: s.bgSpotlight, electric: s.bgElectric };
  const bgCls = bgMap[bgClass] || s.bgNone;
  const showBackdrop = bgClass && bgClass !== 'none';

  return (
    <div
      className={`${s.stage} ${bgCls} ${exiting ? s.exit : ''}`}
      style={style}
      key={sessionKey}
    >
      {showBackdrop && <div className={s.backdrop} aria-hidden />}
      {showBackdrop && <div className={s.spotlight} aria-hidden />}
      <div className={s.card}>
        {studio.showPhoto !== false && (
          <div className={s.photoCol}>
            <div className={s.photoFrame}>
              {photoSrc ? <img src={photoSrc} alt="" /> : (
                <div className={s.photoFb}><UserRound size={88} /></div>
              )}
            </div>
          </div>
        )}
        <div className={s.copy}>
          <div className={s.kicker}>Player introduction</div>
          <h1 className={s.name}>{player?.name || 'Player'}</h1>
          {studio.showRole !== false && (
            <span className={s.roleBadge}>
              <Shield size={14} />
              {role}
            </span>
          )}
          <div className={s.base}>Base {moneyIntro(player?.basePrice)}</div>
          {rows.length > 0 && (
            <div className={s.stats}>
              {rows.map((row) => (
                <div key={row.label} className={s.stat}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
