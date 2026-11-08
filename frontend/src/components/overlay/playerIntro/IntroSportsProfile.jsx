import { UserRound } from 'lucide-react';
import { useIntroPresentationProps } from './playerIntroShared';
import s from './IntroSportsProfile.module.css';

export default function IntroSportsProfile({ player, config, sessionKey, exiting, studioOverride }) {
  const { studio, rows, photoSrc, role, style } = useIntroPresentationProps({
    player, config, sessionKey, exiting, studioOverride,
  });

  return (
    <div className={`${s.stage} ${exiting ? s.exit : ''}`} style={style} key={sessionKey}>
      <div className={s.panel}>
        {studio.showPhoto !== false && (
          <div className={s.photoSide}>
            <div className={s.photoWrap}>
              {photoSrc ? <img src={photoSrc} alt="" /> : (
                <div className={s.photoFb}><UserRound size={64} /></div>
              )}
            </div>
          </div>
        )}
        <div className={s.infoSide}>
          <div className={s.eyebrow}>Up next</div>
          <h1 className={s.name}>{player?.name || 'Player'}</h1>
          {studio.showRole !== false && <div className={s.role}>{role}</div>}
          {rows.length > 0 && (
            <div className={s.grid}>
              {rows.map((row, i) => (
                <div
                  key={row.label}
                  className={s.cell}
                  style={{ animationDelay: `${0.08 * i}s` }}
                >
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
