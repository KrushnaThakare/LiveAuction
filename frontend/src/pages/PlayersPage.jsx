import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../api/players';
import { auctionApi } from '../api/auction';
import PlayerCard from '../components/players/PlayerCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { exportPlayersList } from '../utils/playersExport';
import { formatRole } from '../utils/formatters';
import toast from 'react-hot-toast';
import { Users, Upload, Search, Download, X, RefreshCw } from 'lucide-react';

const ROLES       = ['ALL', 'BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'];
const STATUS_FILTERS = ['ALL', 'AVAILABLE', 'SOLD', 'UNSOLD', 'IN_AUCTION'];

export default function PlayersPage() {
  const { activeTournament } = useTournament();
  const navigate = useNavigate();

  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit modal
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editForm, setEditForm]           = useState({ name: '', role: 'BATSMAN', basePrice: '', imageUrl: '' });
  const [editSaving, setEditSaving]       = useState(false);

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

  /* ── upload ── */
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

  /* ── start auction ── */
  const handleStartAuction = async (player) => {
    if (!activeTournament) return;
    try {
      await auctionApi.startAuction(activeTournament.id, player.id);
      toast.success(`Auction started for ${player.name}`);
      navigate('/auction');
    } catch { /* handled */ }
  };

  /* ── delete ── */
  const handleDelete = async (player) => {
    if (!confirm(`Delete "${player.name}"? This cannot be undone.`)) return;
    try {
      await playerApi.delete(activeTournament.id, player.id);
      toast.success(`${player.name} deleted`);
      setPlayers(p => p.filter(x => x.id !== player.id));
    } catch { /* handled */ }
  };

  /* ── open edit ── */
  const openEdit = (player) => {
    setEditingPlayer(player);
    setEditForm({
      name:      player.name,
      role:      player.role,
      basePrice: player.basePrice,
      imageUrl:  player.imageUrl || '',
    });
  };

  /* ── save edit ── */
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingPlayer) return;
    setEditSaving(true);
    try {
      const res = await playerApi.update(activeTournament.id, editingPlayer.id, {
        name:      editForm.name,
        role:      editForm.role,
        basePrice: parseFloat(editForm.basePrice),
        imageUrl:  editForm.imageUrl,
      });
      toast.success('Player updated');
      setPlayers(p => p.map(x => x.id === editingPlayer.id ? res.data.data : x));
      setEditingPlayer(null);
    } finally {
      setEditSaving(false);
    }
  };


  /* ── export ── */
  const handleExport = () => {
    if (players.length === 0) { toast.error('No players to export'); return; }
    exportPlayersList(filteredPlayers, activeTournament?.name);
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (roleFilter === 'ALL'   || p.role   === roleFilter)   &&
    (statusFilter === 'ALL' || p.status === statusFilter)
  );

  const stats = {
    total:     players.length,
    available: players.filter(p => p.status === 'AVAILABLE').length,
    sold:      players.filter(p => p.status === 'SOLD').length,
    unsold:    players.filter(p => p.status === 'UNSOLD').length,
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Players</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{activeTournament.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {players.length > 0 && (
            <>
              <button className="btn-secondary" onClick={fetchPlayers}>
                <RefreshCw size={15} />
                Refresh
              </button>
              <button className="btn-secondary" onClick={handleExport}>
                <Download size={15} />
                Export List
              </button>
            </>
          )}
          <label className="btn-primary cursor-pointer">
            {uploading
              ? <><span className="animate-spin inline-block">⏳</span> Uploading...</>
              : <><Upload size={15} /> Upload Excel</>}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',     value: stats.total,     color: 'var(--color-primary)' },
          { label: 'Available', value: stats.available, color: 'var(--color-text-secondary)' },
          { label: 'Sold',      value: stats.sold,      color: 'var(--color-sold)' },
          { label: 'Unsold',    value: stats.unsold,    color: 'var(--color-unsold)' },
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
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-secondary)' }} />
          <input className="input pl-9" placeholder="Search players..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{r === 'ALL' ? 'All Roles' : r.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</option>)}
        </select>
        {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <button className="btn-secondary !px-3" onClick={() => { setSearch(''); setRoleFilter('ALL'); setStatusFilter('ALL'); }}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Excel hint */}
      <div className="rounded-lg px-4 py-3 mb-6 text-sm"
        style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
        <strong style={{ color: 'var(--color-primary)' }}>Excel Format:</strong>
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {' '}Name | Role | Base Price | Image URL (Google Drive links auto-converted)
        </span>
        <div className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-accent)' }}>Valid roles:</strong>
          {' '}Batsman · Bowler · Allrounder / All Rounder / AR · Wicket Keeper / WK
          &nbsp;·&nbsp; Hover a player card to Edit or Delete.
          &nbsp;·&nbsp; Images load when you are logged into Google Drive.
        </div>
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
          description={players.length === 0
            ? 'Upload an Excel file to add players to this tournament.'
            : 'Try adjusting your search or filters.'}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onStartAuction={handleStartAuction}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Edit Player Modal */}
      <Modal isOpen={!!editingPlayer} onClose={() => setEditingPlayer(null)} title="Edit Player">
        <form onSubmit={handleEditSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name *</label>
            <input className="input" required value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Role *</label>
            <select className="input" value={editForm.role}
              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
              {['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'].map(r => (
                <option key={r} value={r}>{formatRole(r)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Base Price (₹) *</label>
            <input type="number" className="input" required min="1" step="100"
              value={editForm.basePrice}
              onChange={e => setEditForm(f => ({ ...f, basePrice: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Image URL <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(Google Drive link OK)</span>
            </label>
            <input className="input" placeholder="https://..." value={editForm.imageUrl}
              onChange={e => setEditForm(f => ({ ...f, imageUrl: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditingPlayer(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
