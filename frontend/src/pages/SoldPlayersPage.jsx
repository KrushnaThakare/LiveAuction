import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../api/players';
import { registrationApi } from '../api/registration';
import { formatCurrency, formatRole, getRoleColor, getRoleBg, getAuctionDisplayName } from '../utils/formatters';
import {
  buildRegistrationIndex,
  maskMobile,
  resolvePlayerMobile,
} from '../utils/whatsappMessaging';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { Trophy, Search, MessageCircle, RefreshCw } from 'lucide-react';

function statusMeta(status) {
  switch (status) {
    case 'SENT':
      return { label: 'Sent', color: 'var(--color-success)', bg: 'rgba(16,185,129,0.12)' };
    case 'FAILED':
      return { label: 'Failed', color: 'var(--color-danger)', bg: 'rgba(239,68,68,0.12)' };
    case 'SKIPPED':
      return { label: 'Skipped', color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.12)' };
    case 'PENDING':
      return { label: 'Sending…', color: 'var(--color-primary)', bg: 'rgba(59,130,246,0.12)' };
    default:
      return { label: '—', color: 'var(--color-text-secondary)', bg: 'transparent' };
  }
}

export default function SoldPlayersPage() {
  const { activeTournament } = useTournament();
  const [players, setPlayers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  const registrationIndex = useMemo(
    () => buildRegistrationIndex(registrations),
    [registrations]
  );

  const fetchSold = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const [playersRes, regsRes] = await Promise.all([
        playerApi.getAll(activeTournament.id, 'SOLD'),
        registrationApi.getRegistrations(activeTournament.id).catch(() => ({ data: { data: [] } })),
      ]);
      setPlayers(playersRes.data.data || []);
      setRegistrations(regsRes.data.data || []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchSold(); }, [fetchSold]);

  const hasPending = players.some(p => p.whatsappNotifyStatus === 'PENDING');
  useEffect(() => {
    if (!hasPending || !activeTournament) return undefined;
    const timer = setInterval(fetchSold, 5000);
    return () => clearInterval(timer);
  }, [hasPending, activeTournament, fetchSold]);

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.teamName || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredIds = useMemo(() => new Set(filtered.map(p => p.id)), [filtered]);
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const totalSpend = players.reduce((s, p) => s + p.currentBid, 0);
  const withMobileCount = players.filter(p => resolvePlayerMobile(p, registrationIndex)).length;
  const failedCount = players.filter(p => p.whatsappNotifyStatus === 'FAILED').length;

  const toggleSelect = (playerId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach(p => next.delete(p.id));
      else filtered.forEach(p => next.add(p.id));
      return next;
    });
  };

  const retryPlayers = async (playerIds) => {
    if (!activeTournament || !playerIds.length) return;
    setRetrying(true);
    try {
      await playerApi.retryWhatsAppBulk(activeTournament.id, playerIds);
      await fetchSold();
      toast.success(`Retried WhatsApp for ${playerIds.length} player(s)`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'WhatsApp retry failed');
    } finally {
      setRetrying(false);
    }
  };

  const retrySelected = () => {
    const ids = [...selected].filter(id => filteredIds.has(id));
    if (!ids.length) {
      toast.error('Select at least one player');
      return;
    }
    retryPlayers(ids);
  };

  const retryAllFailed = () => {
    const ids = players.filter(p => p.whatsappNotifyStatus === 'FAILED').map(p => p.id);
    if (!ids.length) {
      toast.error('No failed WhatsApp messages to retry');
      return;
    }
    retryPlayers(ids);
  };

  if (!activeTournament) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState icon={Trophy} title="No tournament selected" />
      </div>
    );
  }

  const tournamentLabel = getAuctionDisplayName(activeTournament, activeTournament.name);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Sold Players
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {tournamentLabel} — {players.length} sold • {withMobileCount} with mobile • Total: {formatCurrency(totalSpend)}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={fetchSold} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          className="btn-primary"
          disabled={!selected.size || retrying}
          onClick={retrySelected}
        >
          <MessageCircle size={15} /> Retry WhatsApp ({selected.size})
        </button>
        {failedCount > 0 && (
          <button type="button" className="btn-secondary" disabled={retrying} onClick={retryAllFailed}>
            Retry all failed ({failedCount})
          </button>
        )}
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Congratulations messages are sent <strong>automatically</strong> when a player is sold.
        Enable this under Registration Settings → Auto WhatsApp on sell, and configure
        <code className="mx-1">WHATSAPP_API_TOKEN</code> + <code>WHATSAPP_PHONE_NUMBER_ID</code> on the server.
      </p>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
        <input className="input pl-9" placeholder="Search by player or team name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="lg" text="Loading sold players..." /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Trophy} title="No sold players" description="Sold players will appear here after the auction." />
      ) : (
        <div className="space-y-2">
          <div
            className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wide px-4 py-2 rounded-lg items-center gap-1"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-2)' }}
          >
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                aria-label="Select all visible"
              />
            </div>
            <div className="col-span-1">#</div>
            <div className="col-span-3">Player</div>
            <div className="col-span-1">Role</div>
            <div className="col-span-2">Sold</div>
            <div className="col-span-2">Team</div>
            <div className="col-span-1">Mobile</div>
            <div className="col-span-1">WhatsApp</div>
          </div>

          {filtered.map((player, idx) => {
            const roleColor = getRoleColor(player.role);
            const roleBg = getRoleBg(player.role);
            const mobile = resolvePlayerMobile(player, registrationIndex);
            const status = statusMeta(player.whatsappNotifyStatus);
            const isChecked = selected.has(player.id);

            return (
              <div
                key={player.id}
                className="grid grid-cols-12 items-center px-4 py-3 rounded-xl gap-1 transition-all duration-200"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(player.id)}
                    aria-label={`Select ${player.name}`}
                  />
                </div>
                <div className="col-span-1 text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {idx + 1}
                </div>
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: roleBg, color: roleColor }}
                  >
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : player.name[0]}
                  </div>
                  <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {player.name}
                  </span>
                </div>
                <div className="col-span-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: roleBg, color: roleColor }}
                  >
                    {formatRole(player.role)}
                  </span>
                </div>
                <div className="col-span-2 text-sm font-bold" style={{ color: 'var(--color-sold)' }}>
                  {formatCurrency(player.currentBid)}
                </div>
                <div className="col-span-2 min-w-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full truncate block text-center"
                    style={{
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary)',
                    }}
                  >
                    {player.teamName || '—'}
                  </span>
                </div>
                <div className="col-span-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {mobile ? maskMobile(mobile) : '—'}
                </div>
                <div className="col-span-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: status.bg, color: status.color }}
                    title={player.whatsappNotifyError || status.label}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
