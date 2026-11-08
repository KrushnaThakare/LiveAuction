import { UserRound } from 'lucide-react';
import { useIntroPresentationProps, moneyIntro } from './playerIntroShared';
import s from './IntroDynamicCard.module.css';

export default function IntroDynamicCard({ player, config, sessionKey, exiting, studioOverride }) {
  const { studio, rows, photoSrc, role, style } = useIntroPresentationProps({
    player, config, sessionKey, exiting, studioOverride,
  });

  const bare = studio.backgroundStyle === 'none';

  return (
    <div className={`${s.stage} ${exiting ? s.exit : ''}`} style={style} key={sessionKey}>
      <div className={`${s.card} ${bare ? s.cardBare : ''}`}>
        <div className={s.accent} aria-hidden />
        {studio.showPhoto !== false && (
          <div className={s.photo}>
            {photoSrc ? <img src={photoSrc} alt="" /> : (
              <div className={s.photoFb}><UserRound size={72} /></div>
            )}
          </div>
        )}
        <div className={s.body}>
          <div className={s.kicker}>Auction spotlight</div>
          <h1 className={s.name}>{player?.name || 'Player'}</h1>
          {studio.showRole !== false && <div className={s.role}>{role}</div>}
          <div className={s.base}>Base {moneyIntro(player?.basePrice)}</div>
          {rows.length > 0 && (
            <div className={s.chips}>
              {rows.slice(0, 6).map((row) => (
                <span key={row.label} className={s.chip}>{row.label}: {row.value}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
