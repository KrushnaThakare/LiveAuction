import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { getRoleShortLabel } from '../../utils/formatters';
import squadStyles from './AudienceSquad.module.css';

const DURATION_MS = 720;

export default function SquadFlyCard({ player, fromRect, toRect, playerRoles, onComplete }) {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!fromRect || !toRect || !player) return undefined;

    setStyle({
      left: `${fromRect.left}px`,
      top: `${fromRect.top}px`,
      width: `${fromRect.width}px`,
      height: `${fromRect.height}px`,
      transform: 'translate(0, 0) scale(1) rotate(0deg)',
      opacity: 1,
    });

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
        const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
        const scale = Math.max(0.22, Math.min(toRect.width / fromRect.width, toRect.height / fromRect.height));
        setStyle({
          left: `${fromRect.left}px`,
          top: `${fromRect.top}px`,
          width: `${fromRect.width}px`,
          height: `${fromRect.height}px`,
          transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(3deg)`,
          opacity: 0.92,
        });
      });
    });

    const timer = setTimeout(() => onComplete?.(), DURATION_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [player, fromRect, toRect, onComplete]);

  if (!player || !style) return null;

  return (
    <div className={squadStyles.flyLayer} aria-hidden>
      <div className={squadStyles.flyCard} style={{ ...style, transition: `transform ${DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${DURATION_MS}ms ease` }}>
        <div className={squadStyles.flyPhoto}>
          {player.imageUrl ? (
            <img src={player.imageUrl} alt="" />
          ) : (
            <UserRound size={48} />
          )}
        </div>
        <div className={squadStyles.flyMeta}>
          <span>{player.firstName}</span>
          <small>{getRoleShortLabel(player.role, playerRoles)}</small>
        </div>
      </div>
    </div>
  );
}
