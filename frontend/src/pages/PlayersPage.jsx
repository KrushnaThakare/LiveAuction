import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../api/players';
import { auctionApi } from '../api/auction';
import PlayerCard from '../components/players/PlayerCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { Users, Upload, Search, Filter } from 'lucide-react';

const ROLES = ['ALL', 'BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'];
const STATUS_FILTERS = ['ALL', 'AVAILABLE', 'SOLD', 'UNSOLD', 'IN_AUCTION'];

export default function PlayersPage() {
  const { activeTournament } = useTournament();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchPlayers = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const res = await playerApi.getAll(activeTournament.id);
      setPlayers(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeTournament) return;
    setUploading(true);
    try {
      const res = await playerApi.upload(activeTournament.id, file);
      toast.success(res.data.message);
      fetchPlayers();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleStartAuction = async (player) => {
    if (!activeTournament) return;
    try {
      await auctionApi.startAuction(activeTournament.id, player.id);
      toast.success(`Auction started for ${player.name}`);
      navigate('/auction');
    } catch {
      // handled by interceptor
    }
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: players.length,
    available: players.filter((p) => p.status === 'AVAILABLE').length,
    sold: players.filter((p) => p.status === 'SOLD').length,
    unsold: players.filter((p) => p.status === 'UNSOLD').length,
  };

  if (!activeTournament) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState icon={Users} title="No tournament selected" description="Please select or create a tournament first." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Players
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {activeTournament.name}
          </p>
        </div>
        <label className="btn-primary cursor-pointer">
          {uploading ? (
            <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Uploading...</span>
          ) : (
            <>
              <Upload size={16} />
              Upload Excel
            </>
          )}
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'var(--color-primary)' },
          { label: 'Available', value: stats.available, color: 'var(--color-text-secondary)' },
          { label: 'Sold', value: stats.sold, color: 'var(--color-sold)' },
          { label: 'Unsold', value: stats.unsold, color: 'var(--color-unsold)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
          <input
            className="input pl-9"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</option>
          ))}
        </select>
      </div>

      {/* Excel format hint */}
      <div
        className="rounded-lg px-4 py-3 mb-6 text-sm"
        style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <strong style={{ color: 'var(--color-primary)' }}>Excel Format:</strong>
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {' '}Columns: Name | Role (BATSMAN/BOWLER/ALL_ROUNDER/WICKET_KEEPER) | Base Price | Image URL (Google Drive links auto-converted)
        </span>
      </div>

      {/* Player Grid */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" text="Loading players..." />
        </div>
      ) : filteredPlayers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={players.length === 0 ? 'No players uploaded' : 'No players match your filters'}
          description={players.length === 0 ? 'Upload an Excel file to add players to this tournament.' : 'Try adjusting your search or filters.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onStartAuction={handleStartAuction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
