import { useState, useEffect } from 'react';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../../utils/formatters';

function PlayerImg({ imgUrl, name, roleColor }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [imgUrl]);
  if (!imgUrl || failed) {
    return (
      <span className="absolute inset-0 flex items-center justify-center text-5xl font-black select-none"
        style={{ color: roleColor, opacity: 0.55 }}>
        {name?.[0] ?? '?'}
      </span>
    );
  }
  return (
    <img src={imgUrl} alt={name} referrerPolicy="no-referrer" crossOrigin="anonymous"
      className="w-full h-full object-cover object-top"
      onError={() => setFailed(true)} />
  );
}

const STATUS_LABELS = {
  AVAILABLE: 'Available',
  IN_AUCTION: 'In Auction',
  SOLD: 'Sold',
  UNSOLD: 'Unsold',
};
const STATUS_CLASS = {
  AVAILABLE:  'badge-available',
  IN_AUCTION: 'badge-in-auction',
  SOLD:       'badge-sold',
  UNSOLD:     'badge-unsold',
};

function driveImgUrl(url) {
  if (!url) return null;
  if (url.includes('lh3.googleusercontent.com')) return url;
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w400-h400`;
  }
  return url;
}

export default function PlayerCard({ player, onStartAuction }) {
  const roleColor = getRoleColor(player.role);
  const roleBg    = getRoleBg(player.role);
  const imgUrl    = driveImgUrl(player.imageUrl);

  return (
    <div className="card-hover group relative overflow-hidden">
      {/* Role accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: roleColor }} />

      {/* Player photo — square, top of card */}
      <div
        className="w-full aspect-square rounded-xl overflow-hidden mb-3 flex items-center justify-center font-black text-5xl relative"
        style={{ backgroundColor: roleBg, color: roleColor }}
      >
        <PlayerImg imgUrl={imgUrl} name={player.name} roleColor={roleColor} />

        {/* Status badge over image */}
        <div className="absolute top-2 right-2">
          <span className={STATUS_CLASS[player.status]}>{STATUS_LABELS[player.status]}</span>
        </div>
      </div>

      {/* Name & Role */}
      <h3 className="font-bold text-sm truncate mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {player.name}
      </h3>
      <span
        className="text-xs px-2 py-0.5 rounded-md font-medium"
        style={{ backgroundColor: roleBg, color: roleColor }}
      >
        {formatRole(player.role)}
      </span>

      {/* Pricing */}
      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Base </span>
          <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
            {formatCurrency(player.basePrice)}
          </span>
        </div>
        {player.status === 'SOLD' && player.currentBid > 0 && (
          <span className="text-sm font-bold" style={{ color: 'var(--color-sold)' }}>
            {formatCurrency(player.currentBid)}
          </span>
        )}
        {player.teamName && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-primary)',
          }}>
            {player.teamName}
          </span>
        )}
      </div>

      {onStartAuction && player.status === 'AVAILABLE' && (
        <button
          onClick={(e) => { e.stopPropagation(); onStartAuction(player); }}
          className="btn-primary w-full mt-3 !py-1.5 text-sm"
        >
          Start Auction
        </button>
      )}
    </div>
  );
}
