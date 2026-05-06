import { useState, useEffect } from 'react';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../../utils/formatters';
import { driveImg } from '../../utils/driveImage';
import SequentialImage from '../common/SequentialImage';
import { Trash2, Edit, Star } from 'lucide-react';

const ROLE_ICONS = { BATSMAN: '🏏', BOWLER: '🎳', ALL_ROUNDER: '⭐', WICKET_KEEPER: '🧤' };

const STATUS_LABELS = { AVAILABLE: 'Available', IN_AUCTION: 'In Auction', SOLD: 'Sold', UNSOLD: 'Unsold' };
const STATUS_CLASS  = { AVAILABLE: 'badge-available', IN_AUCTION: 'badge-in-auction', SOLD: 'badge-sold', UNSOLD: 'badge-unsold' };

export default function PlayerCard({ player, onStartAuction, onEdit, onDelete }) {
  const roleColor = getRoleColor(player.role);
  const roleBg    = getRoleBg(player.role);
  const imgUrl    = driveImg(player.imageUrl);

  return (
    <div
      className="card-hover group relative overflow-hidden flex flex-col"
      style={{ borderRadius: 20 }}
    >
      {/* Role accent strip at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 z-10"
        style={{ background: `linear-gradient(90deg, ${roleColor}, transparent)` }} />

      {/* Player photo */}
      <div className="w-full aspect-square rounded-2xl overflow-hidden mb-3 relative flex-shrink-0"
        style={{
          background: `radial-gradient(circle at 40% 30%, ${roleBg} 0%, rgba(0,0,0,0.4) 80%)`,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06)`,
        }}>
        <SequentialImage
          src={imgUrl}
          alt={player.name}
          className="w-full h-full object-cover object-top"
          fallback={
            <span className="absolute inset-0 flex items-center justify-center font-black select-none text-5xl"
              style={{ color: roleColor, opacity: 0.4 }}>
              {player.name?.[0]?.toUpperCase()}
            </span>
          }
        />

        {/* Status badge */}
        <div className="absolute top-2 left-2 z-10">
          <span className={STATUS_CLASS[player.status]}>{STATUS_LABELS[player.status]}</span>
        </div>

        {/* Edit / Delete */}
        {(onEdit || onDelete) && (
          <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200">
            {onEdit && (
              <button onClick={e => { e.stopPropagation(); onEdit(player); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm"
                style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                <Edit size={12} />
              </button>
            )}
            {onDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete(player); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-sm"
                style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}

        {/* Gradient overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 h-12"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', pointerEvents: 'none' }} />
      </div>

      {/* Player info */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-black text-sm mb-1 truncate"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {player.name}
        </h3>

        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs">{ROLE_ICONS[player.role]}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: roleBg, color: roleColor }}>
            {formatRole(player.role)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>Base </span>
            <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
              {formatCurrency(player.basePrice)}
            </span>
          </div>
          {player.status === 'SOLD' && player.currentBid > 0 && (
            <span className="text-xs font-black" style={{ color: 'var(--color-sold)' }}>
              {formatCurrency(player.currentBid)}
            </span>
          )}
          {player.teamName && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--color-primary-glow, rgba(59,130,246,0.15))', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
              {player.teamName}
            </span>
          )}
        </div>

        {onStartAuction && player.status === 'AVAILABLE' && (
          <button
            onClick={e => { e.stopPropagation(); onStartAuction(player); }}
            className="btn-primary w-full justify-center mt-3 py-1.5 text-xs">
            🏏 Start Auction
          </button>
        )}
      </div>
    </div>
  );
}
