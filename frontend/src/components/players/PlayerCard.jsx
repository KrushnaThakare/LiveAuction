import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../../utils/formatters';

const STATUS_LABELS = {
  AVAILABLE: 'Available',
  IN_AUCTION: 'In Auction',
  SOLD: 'Sold',
  UNSOLD: 'Unsold',
};

const STATUS_CLASS = {
  AVAILABLE: 'badge-available',
  IN_AUCTION: 'badge-in-auction',
  SOLD: 'badge-sold',
  UNSOLD: 'badge-unsold',
};

export default function PlayerCard({ player, onStartAuction, compact = false }) {
  const roleColor = getRoleColor(player.role);
  const roleBg = getRoleBg(player.role);

  return (
    <div className="card-hover group relative overflow-hidden">
      {/* Role color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ backgroundColor: roleColor }}
      />

      <div className="flex items-start gap-3">
        {/* Player Image */}
        <div
          className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-lg"
          style={{ backgroundColor: roleBg, color: roleColor }}
        >
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span className={player.imageUrl ? 'hidden' : 'flex items-center justify-center w-full h-full'}>
            {player.name[0]}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-semibold text-sm truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {player.name}
            </h3>
            <span className={STATUS_CLASS[player.status]}>{STATUS_LABELS[player.status]}</span>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-md font-medium"
              style={{ backgroundColor: roleBg, color: roleColor }}
            >
              {formatRole(player.role)}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Base: </span>
              <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                {formatCurrency(player.basePrice)}
              </span>
              {player.status === 'SOLD' && player.currentBid > 0 && (
                <>
                  <span className="text-xs ml-2" style={{ color: 'var(--color-text-secondary)' }}>Sold: </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-sold)' }}>
                    {formatCurrency(player.currentBid)}
                  </span>
                </>
              )}
            </div>
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
        </div>
      </div>

      {/* Action button */}
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
