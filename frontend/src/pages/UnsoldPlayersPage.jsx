import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../api/players';
import { auctionApi } from '../api/auction';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { XCircle, Search, Gavel } from 'lucide-react';

export default function UnsoldPlayersPage() {
  const { activeTournament } = useTournament();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUnsold = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const res = await playerApi.getAll(activeTournament.id, 'UNSOLD');
      setPlayers(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchUnsold(); }, [fetchUnsold]);

  const handleRetryAuction = async (player) => {
    if (!activeTournament) return;
    try {
      await auctionApi.startAuction(activeTournament.id, player.id);
      toast.success(`Re-auctioning ${player.name}`);
      navigate('/auction');
    } catch { /* handled */ }
  };

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!activeTournament) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState icon={XCircle} title="No tournament selected" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Unsold Players
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {activeTournament.name} — {players.length} unsold players
          </p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
        <input className="input pl-9" placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="lg" text="Loading unsold players..." /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={XCircle} title="No unsold players" description="Players marked as unsold during auction will appear here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((player) => {
            const roleColor = getRoleColor(player.role);
            const roleBg = getRoleBg(player.role);
            return (
              <div
                key={player.id}
                className="card-hover"
                style={{ borderColor: 'var(--color-unsold)', borderWidth: '1px' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center font-bold text-xl flex-shrink-0"
                    style={{ backgroundColor: roleBg, color: roleColor }}
                  >
                    {player.imageUrl ? (
                      <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : player.name[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{player.name}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
                      style={{ backgroundColor: roleBg, color: roleColor }}
                    >
                      {formatRole(player.role)}
                    </span>
                    <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                      Base: <strong style={{ color: 'var(--color-accent)' }}>{formatCurrency(player.basePrice)}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRetryAuction(player)}
                  className="btn-secondary w-full mt-3 text-sm !py-1.5"
                >
                  <Gavel size={14} />
                  Re-auction
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
