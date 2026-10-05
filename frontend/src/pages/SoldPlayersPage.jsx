import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../api/players';
import { registrationApi } from '../api/registration';
import { formatCurrency, formatRole, getRoleColor, getRoleBg, getAuctionDisplayName } from '../utils/formatters';
import {
  buildRegistrationIndex,
  maskMobile,
  resolvePlayerMobile,
} from '../utils/playerMobile';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { Trophy, Search, RefreshCw } from 'lucide-react';

export default function SoldPlayersPage() {
  const { activeTournament } = useTournament();
  const [players, setPlayers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const tournamentId = activeTournament?.id;
  const hasLoadedRef = useRef(false);
  const fetchInFlightRef = useRef(false);

  const registrationIndex = useMemo(
    () => buildRegistrationIndex(registrations),
    [registrations],
  );

  const fetchSold = useCallback(async ({ blocking = false } = {}) => {
    if (!tournamentId) return;
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    const showBlockingLoader = blocking || !hasLoadedRef.current;
    if (showBlockingLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const [playersRes, regsRes] = await Promise.all([
        playerApi.getAll(tournamentId, 'SOLD'),
        registrationApi.getRegistrations(tournamentId).catch(() => ({ data: { data: [] } })),
      ]);
      setPlayers(playersRes.data.data || []);
      setRegistrations(regsRes.data.data || []);
      hasLoadedRef.current = true;
    } catch {
      // Keep the current list visible during background refresh failures.
    } finally {
      fetchInFlightRef.current = false;
      if (showBlockingLoader) setLoading(false);
      else setRefreshing(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setPlayers([]);
    setRegistrations([]);
    fetchSold({ blocking: true });
  }, [tournamentId, fetchSold]);

  const sortedPlayers = useMemo(() => (
    [...players].sort((a, b) => {
      const retainedOrder = Number(Boolean(b.retained)) - Number(Boolean(a.retained));
      if (retainedOrder !== 0) return retainedOrder;
      return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
    })
  ), [players]);

  const filtered = sortedPlayers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.teamName || '').toLowerCase().includes(search.toLowerCase()),
  );

  const totalSpend = players.reduce((s, p) => s + (Number(p.currentBid) || 0), 0);
  const withMobileCount = players.filter((p) => resolvePlayerMobile(p, registrationIndex)).length;

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
            {refreshing && ' • Updating…'}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => fetchSold({ blocking: false })}
          disabled={loading || refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

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
            <div className="col-span-1">#</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Sold</div>
            <div className="col-span-2">Team</div>
            <div className="col-span-1">Mobile</div>
          </div>

          {filtered.map((player, idx) => {
            const roleColor = getRoleColor(player.role);
            const roleBg = getRoleBg(player.role);
            const mobile = resolvePlayerMobile(player, registrationIndex);

            return (
              <div
                key={player.id}
                className="grid grid-cols-12 items-center px-4 py-3 rounded-xl gap-1 transition-all duration-200"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: `1px solid ${player.retained ? 'rgba(245,158,11,0.45)' : 'var(--color-border)'}`,
                }}
              >
                <div className="col-span-1 text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {idx + 1}
                </div>
                <div className="col-span-4 flex items-center gap-2 min-w-0">
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
                  <div className="min-w-0">
                    <span className="font-semibold text-sm truncate block" style={{ color: 'var(--color-text-primary)' }}>
                      {player.name}
                    </span>
                    {player.retained && (
                      <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-warning)' }}>Retained</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
