import { useState, useEffect } from 'react';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../../utils/formatters';
import { driveImg } from '../../utils/driveImage';
import { Trash2, Edit } from 'lucide-react';

/* ── Shared image component ──────────────────────────────── */
export function PlayerImg({ imgUrl, name, roleColor, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [imgUrl]);

  if (!imgUrl || failed) {
    return (
      <span className="absolute inset-0 flex items-center justify-center font-black select-none"
        style={{ fontSize: '3rem', color: roleColor, opacity: 0.55, ...style }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </span>
    );
  }
  // Plain <img>: no crossOrigin, no referrerPolicy — just load the URL normally
  return (
    <img
      src={imgUrl}
      alt={name}
      loading="lazy"
      className="w-full h-full object-cover object-top"
      onError={() => setFailed(true)}
    />
  );
}

/* ── Status labels ───────────────────────────────────────── */
const STATUS_LABELS = { AVAILABLE: 'Available', IN_AUCTION: 'In Auction', SOLD: 'Sold', UNSOLD: 'Unsold' };
const STATUS_CLASS  = { AVAILABLE: 'badge-available', IN_AUCTION: 'badge-in-auction', SOLD: 'badge-sold', UNSOLD: 'badge-unsold' };

/* ══════════════════════════════════════════════════════════
   PLAYER CARD
══════════════════════════════════════════════════════════ */
export default function PlayerCard({ player, onStartAuction, onEdit, onDelete }) {
  const roleColor = getRoleColor(player.role);
  const roleBg    = getRoleBg(player.role);
  const imgUrl    = driveImg(player.imageUrl);

  return (
    <div className="card-hover group relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ backgroundColor: roleColor }} />

      {/* Photo */}
      <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 relative flex-shrink-0"
        style={{ backgroundColor: roleBg }}>
        <PlayerImg imgUrl={imgUrl} name={player.name} roleColor={roleColor} />

        <div className="absolute top-2 left-2 z-10">
          <span className={STATUS_CLASS[player.status]}>{STATUS_LABELS[player.status]}</span>
        </div>

        {(onEdit || onDelete) && (
          <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button onClick={e => { e.stopPropagation(); onEdit(player); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(15,23,42,0.85)', color: 'var(--color-primary)' }}>
                <Edit size={13} />
              </button>
            )}
            {onDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete(player); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(15,23,42,0.85)', color: 'var(--color-danger)' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      <h3 className="font-bold text-sm truncate mb-1" style={{ color: 'var(--color-text-primary)' }}>{player.name}</h3>
      <span className="text-xs px-2 py-0.5 rounded-md font-medium w-fit"
        style={{ backgroundColor: roleBg, color: roleColor }}>{formatRole(player.role)}</span>

      <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Base </span>
          <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>{formatCurrency(player.basePrice)}</span>
        </div>
        {player.status === 'SOLD' && player.currentBid > 0 && (
          <span className="text-sm font-bold" style={{ color: 'var(--color-sold)' }}>{formatCurrency(player.currentBid)}</span>
        )}
        {player.teamName && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
            {player.teamName}
          </span>
        )}
      </div>

      {onStartAuction && player.status === 'AVAILABLE' && (
        <button onClick={e => { e.stopPropagation(); onStartAuction(player); }}
          className="btn-primary w-full mt-3 !py-1.5 text-sm">
          Start Auction
        </button>
      )}
    </div>
  );
}
