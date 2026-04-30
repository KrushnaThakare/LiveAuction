import { useState, useEffect } from 'react';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../../utils/formatters';
import { Trash2, Edit } from 'lucide-react';

/* ── Drive URL helper ─────────────────────────────────────── */
export function driveImgUrl(url) {
  if (!url) return null;
  if (url.includes('lh3.googleusercontent.com')) return url;
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w600-h600`;
  }
  return url;
}

/* ── Image with proper fallback ────────────────────────────── */
export function PlayerImg({ imgUrl, name, roleColor, className = 'w-full h-full object-cover object-top' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [imgUrl]);

  if (!imgUrl || failed) {
    return (
      <span className="absolute inset-0 flex items-center justify-center font-black select-none"
        style={{ fontSize: '3rem', color: roleColor, opacity: 0.55 }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </span>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={name}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

/* ── Status labels / classes ───────────────────────────────── */
const STATUS_LABELS = { AVAILABLE: 'Available', IN_AUCTION: 'In Auction', SOLD: 'Sold', UNSOLD: 'Unsold' };
const STATUS_CLASS  = { AVAILABLE: 'badge-available', IN_AUCTION: 'badge-in-auction', SOLD: 'badge-sold', UNSOLD: 'badge-unsold' };

/* ══════════════════════════════════════════════════════════
   PLAYER CARD
══════════════════════════════════════════════════════════ */
export default function PlayerCard({ player, onStartAuction, onEdit, onDelete }) {
  const roleColor = getRoleColor(player.role);
  const roleBg    = getRoleBg(player.role);
  const imgUrl    = driveImgUrl(player.imageUrl);

  return (
    <div className="card-hover group relative overflow-hidden flex flex-col">
      {/* Role accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ backgroundColor: roleColor }} />

      {/* Player photo */}
      <div
        className="w-full aspect-square rounded-xl overflow-hidden mb-3 flex items-center justify-center relative flex-shrink-0"
        style={{ backgroundColor: roleBg }}
      >
        <PlayerImg imgUrl={imgUrl} name={player.name} roleColor={roleColor} />

        {/* Status badge */}
        <div className="absolute top-2 left-2 z-10">
          <span className={STATUS_CLASS[player.status]}>{STATUS_LABELS[player.status]}</span>
        </div>

        {/* Edit / Delete — revealed on hover */}
        {(onEdit || onDelete) && (
          <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(player); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(30,41,59,0.85)', color: 'var(--color-primary)' }}
                title="Edit player"
              >
                <Edit size={13} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(player); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(30,41,59,0.85)', color: 'var(--color-danger)' }}
                title="Delete player"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="font-bold text-sm truncate mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {player.name}
      </h3>

      {/* Role badge */}
      <span className="text-xs px-2 py-0.5 rounded-md font-medium w-fit"
        style={{ backgroundColor: roleBg, color: roleColor }}>
        {formatRole(player.role)}
      </span>

      {/* Pricing row */}
      <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
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
            backgroundColor: 'var(--color-surface-2)', color: 'var(--color-primary)',
            border: '1px solid var(--color-primary)',
          }}>
            {player.teamName}
          </span>
        )}
      </div>

      {/* Start auction */}
      {onStartAuction && player.status === 'AVAILABLE' && (
        <button
          onClick={(e) => { e.stopPropagation(); onStartAuction(player); }}
          className="btn-primary w-full mt-3 !py-1.5 text-sm mt-auto"
        >
          Start Auction
        </button>
      )}
    </div>
  );
}
