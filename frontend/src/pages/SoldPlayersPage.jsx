import { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../api/players';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { Trophy, Search } from 'lucide-react';

export default function SoldPlayersPage() {
  const { activeTournament } = useTournament();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSold = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const res = await playerApi.getAll(activeTournament.id, 'SOLD');
      setPlayers(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchSold(); }, [fetchSold]);

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.teamName || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalSpend = players.reduce((s, p) => s + p.currentBid, 0);

  if (!activeTournament) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState icon={Trophy} title="No tournament selected" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Sold Players
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {activeTournament.name} — {players.length} players sold • Total: {formatCurrency(totalSpend)}
          </p>
        </div>
      </div>

      {/* Search */}
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
          {/* Table Header */}
          <div
            className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wide px-4 py-2 rounded-lg"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-2)' }}
          >
            <div className="col-span-1">#</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Base</div>
            <div className="col-span-2">Sold For</div>
            <div className="col-span-1">Team</div>
          </div>

          {filtered.map((player, idx) => {
            const roleColor = getRoleColor(player.role);
            const roleBg = getRoleBg(player.role);
            return (
              <div
                key={player.id}
                className="grid grid-cols-12 items-center px-4 py-3 rounded-xl transition-all duration-200"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-sold)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <div className="col-span-1 text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  {idx + 1}
                </div>
                <div className="col-span-4 flex items-center gap-2">
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
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {player.name}
                  </span>
                </div>
                <div className="col-span-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: roleBg, color: roleColor }}
                  >
                    {formatRole(player.role)}
                  </span>
                </div>
                <div className="col-span-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatCurrency(player.basePrice)}
                </div>
                <div className="col-span-2 text-sm font-bold" style={{ color: 'var(--color-sold)' }}>
                  {formatCurrency(player.currentBid)}
                </div>
                <div className="col-span-1">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
