import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../api/players';
import { auctionApi } from '../api/auction';
import { teamApi } from '../api/teams';
import PlayerCard from '../components/players/PlayerCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { exportPlayersList } from '../utils/playersExport';
import { formatRole, getPlayerRoles, getAuctionDisplayName } from '../utils/formatters';
import { matchesPlayerIdOrName } from '../utils/playerSearch';
import { hasCricHeroesProfile, hasPlayerStats, isCricHeroesProfileUrl, statValue } from '../utils/playerStats';
import toast from 'react-hot-toast';
import { BarChart3, Users, Upload, Search, Download, X, RefreshCw, Plus } from 'lucide-react';

const STATUS_FILTERS = ['ALL', 'AVAILABLE', 'SOLD', 'UNSOLD', 'IN_AUCTION', 'RETAINED'];

export default function PlayersPage() {
  const { activeTournament } = useTournament();
  const navigate = useNavigate();

  const [players, setPlayers]   = useState([]);
  const [teams, setTeams]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit modal
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const emptyPlayerForm = {
    name: '',
    role: 'BATSMAN',
    basePrice: '',
    imageUrl: '',
    cricheroesProfileUrl: '',
    statsMatches: '',
    statsRuns: '',
    statsStrikeRate: '',
    statsWickets: '',
    statsEconomy: '',
    statsAverage: '',
    retained: false,
    teamId: '',
  };
  const [editForm, setEditForm]           = useState(emptyPlayerForm);
  const [editSaving, setEditSaving]       = useState(false);
  const [statsFetching, setStatsFetching] = useState(false);
  const [bulkStatsFetching, setBulkStatsFetching] = useState(false);
  const [bulkStatsProgress, setBulkStatsProgress] = useState({ done: 0, total: 0 });
  const [cleaningProfiles, setCleaningProfiles] = useState(false);
  const playerRoles = getPlayerRoles(activeTournament);
  const defaultRole = playerRoles[0]?.key || 'BATSMAN';

  const fetchPlayers = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const res = await playerApi.getAll(activeTournament.id);
      const teamRes = await teamApi.getAll(activeTournament.id);
      setPlayers(res.data.data || []);
      setTeams(teamRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => {
    const id = setTimeout(fetchPlayers, 0);
    return () => clearTimeout(id);
  }, [fetchPlayers]);

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
    setShowManualModal(false);
    setEditForm({
      name:      player.name,
      role:      player.role,
      basePrice: player.basePrice,
      imageUrl:  player.imageUrl || '',
      cricheroesProfileUrl: player.cricheroesProfileUrl || '',
      statsMatches: player.statsMatches ?? '',
      statsRuns: player.statsRuns ?? '',
      statsStrikeRate: player.statsStrikeRate ?? '',
      statsWickets: player.statsWickets ?? '',
      statsEconomy: player.statsEconomy ?? '',
      statsAverage: player.statsAverage ?? '',
      retained:  Boolean(player.retained),
      teamId:    player.teamId || '',
    });
  };

  const openManualAdd = () => {
    setEditingPlayer(null);
    setEditForm({ ...emptyPlayerForm, role: defaultRole });
    setShowManualModal(true);
  };

  /* ── save edit ── */
  const numberOrNull = (value) => value === '' || value === null || value === undefined ? null : Number(value);

  const buildPlayerPayload = () => ({
    name:      editForm.name,
    role:      editForm.role,
    basePrice: parseFloat(editForm.basePrice),
    imageUrl:  editForm.imageUrl,
    cricheroesProfileUrl: editForm.cricheroesProfileUrl,
    statsMatches: numberOrNull(editForm.statsMatches),
    statsRuns: numberOrNull(editForm.statsRuns),
    statsStrikeRate: numberOrNull(editForm.statsStrikeRate),
    statsWickets: numberOrNull(editForm.statsWickets),
    statsEconomy: numberOrNull(editForm.statsEconomy),
    statsAverage: numberOrNull(editForm.statsAverage),
    retained:  Boolean(editForm.retained),
    teamId:    editForm.retained && editForm.teamId ? Number(editForm.teamId) : null,
  });

  const handleEditSave = async (e) => {
    e.preventDefault();
    const isEdit = Boolean(editingPlayer);
    setEditSaving(true);
    try {
      const payload = buildPlayerPayload();
      const res = isEdit
        ? await playerApi.update(activeTournament.id, editingPlayer.id, payload)
        : await playerApi.create(activeTournament.id, payload);
      toast.success(isEdit ? 'Player updated' : 'Player added');
      if (isEdit) setPlayers(p => p.map(x => x.id === editingPlayer.id ? res.data.data : x));
      else setPlayers(p => [...p, res.data.data]);
      setEditingPlayer(null);
      setShowManualModal(false);
      fetchPlayers();
    } finally {
      setEditSaving(false);
    }
  };

  const handleFetchStats = async () => {
    if (!activeTournament || !editingPlayer) return;
    if (!isCricHeroesProfileUrl(editForm.cricheroesProfileUrl)) {
      toast.error('Please enter a valid CricHeroes player profile URL');
      return;
    }
    setStatsFetching(true);
    try {
      let playerForFetch = editingPlayer;
      if ((editForm.cricheroesProfileUrl || '') !== (editingPlayer.cricheroesProfileUrl || '')) {
        const payload = buildPlayerPayload();
        const saved = await playerApi.update(activeTournament.id, editingPlayer.id, payload);
        playerForFetch = saved.data.data;
      }
      const res = await playerApi.fetchCricHeroesStats(activeTournament.id, playerForFetch.id);
      const updated = res.data.data;
      setPlayers(p => p.map(x => x.id === editingPlayer.id ? updated : x));
      setEditingPlayer(updated);
      setEditForm(f => ({ ...f, cricheroesProfileUrl: updated.cricheroesProfileUrl || f.cricheroesProfileUrl }));
      toast.success('CricHeroes stats refreshed');
    } finally {
      setStatsFetching(false);
    }
  };

  const handleFetchAllStats = async () => {
    if (!activeTournament) return;
    const candidates = players.filter(hasCricHeroesProfile);
    if (candidates.length === 0) {
      toast.error('No players have valid CricHeroes profile URLs');
      return;
    }

    setBulkStatsFetching(true);
    setBulkStatsProgress({ done: 0, total: candidates.length });
    let successCount = 0;
    let failedCount = 0;
    let blockedByCricHeroes = false;

    try {
      for (const player of candidates) {
        try {
          const res = await playerApi.fetchCricHeroesStats(activeTournament.id, player.id);
          const updated = res.data.data;
          setPlayers(prev => prev.map(x => x.id === player.id ? updated : x));
          successCount += 1;
        } catch (error) {
          failedCount += 1;
          const message = error.response?.data?.message || '';
          if (message.includes('CricHeroes blocked this backend request') || message.includes('status 403')) {
            blockedByCricHeroes = true;
            break;
          }
        } finally {
          setBulkStatsProgress(progress => ({ ...progress, done: progress.done + 1 }));
        }
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      if (successCount > 0) toast.success(`Fetched stats for ${successCount} player${successCount === 1 ? '' : 's'}`);
      if (blockedByCricHeroes) {
        toast.error('CricHeroes is blocking backend fetches right now. Bulk fetch stopped; enter cached stats manually or retry later.');
      } else if (failedCount > 0) {
        toast.error(`${failedCount} player${failedCount === 1 ? '' : 's'} failed. CricHeroes may be slow or blocking server requests.`);
      }
    } finally {
      setBulkStatsFetching(false);
    }
  };

  const handleCleanInvalidProfiles = async () => {
    if (!activeTournament) return;
    setCleaningProfiles(true);
    try {
      const res = await playerApi.cleanInvalidCricHeroesProfiles(activeTournament.id);
      const cleaned = res.data.data || 0;
      toast.success(cleaned ? `Cleaned ${cleaned} invalid CricHeroes value${cleaned === 1 ? '' : 's'}` : 'No invalid CricHeroes values found');
      fetchPlayers();
    } finally {
      setCleaningProfiles(false);
    }
  };


  /* ── export ── */
  const handleExport = () => {
    if (players.length === 0) { toast.error('No players to export'); return; }
    exportPlayersList(filteredPlayers, getAuctionDisplayName(activeTournament, activeTournament?.name));
  };

  const filteredPlayers = players.filter(p =>
    matchesPlayerIdOrName(p, search) &&
    (roleFilter === 'ALL'   || p.role   === roleFilter)   &&
    (statusFilter === 'ALL' || (statusFilter === 'RETAINED' ? p.retained : p.status === statusFilter))
  );

  const stats = {
    total:     players.length,
    available: players.filter(p => p.status === 'AVAILABLE').length,
    sold:      players.filter(p => p.status === 'SOLD').length,
    unsold:    players.filter(p => p.status === 'UNSOLD').length,
    retained:  players.filter(p => p.retained).length,
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
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{getAuctionDisplayName(activeTournament, activeTournament.name)}</p>
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
              <button className="btn-secondary" onClick={handleFetchAllStats} disabled={bulkStatsFetching}>
                <BarChart3 size={15} />
                {bulkStatsFetching
                  ? `Fetching ${bulkStatsProgress.done}/${bulkStatsProgress.total}`
                  : 'Fetch All Stats'}
              </button>
              <button className="btn-secondary" onClick={handleCleanInvalidProfiles} disabled={cleaningProfiles || bulkStatsFetching}>
                <X size={15} />
                {cleaningProfiles ? 'Cleaning...' : 'Clean Bad Stats URLs'}
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={openManualAdd}>
            <Plus size={15} />
            Add Player
          </button>
          <label className="btn-primary cursor-pointer">
            {uploading
              ? <><span className="animate-spin inline-block">⏳</span> Uploading...</>
              : <><Upload size={15} /> Upload Excel</>}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total',     value: stats.total,     color: 'var(--color-primary)' },
          { label: 'Available', value: stats.available, color: 'var(--color-text-secondary)' },
          { label: 'Sold',      value: stats.sold,      color: 'var(--color-sold)' },
          { label: 'Unsold',    value: stats.unsold,    color: 'var(--color-unsold)' },
          { label: 'Retained',  value: stats.retained,  color: 'var(--color-warning)' },
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
          <input className="input pl-9" placeholder="Search by player ID or name..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="ALL">All Roles</option>
          {playerRoles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
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
          {' '}| CricHeroes Profile URL (optional)
        </span>
        <div className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-accent)' }}>Optional extra columns</strong>
          {' '}(any header after the standard columns — e.g. Mobile, T-Shirt Size, Pant Size).
          These are stored for squad export only and are not shown in the auction UI.
        </div>
        <div className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-accent)' }}>Valid roles:</strong>
          {' '}{playerRoles.map(r => r.label).join(' · ')}
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
              roles={playerRoles}
              onStartAuction={handleStartAuction}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Edit Player Modal */}
      <Modal
        isOpen={!!editingPlayer || showManualModal}
        onClose={() => { setEditingPlayer(null); setShowManualModal(false); }}
        title={editingPlayer ? 'Edit Player' : 'Add Player'}
      >
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
              {playerRoles.map(r => (
                <option key={r.key} value={r.key}>{formatRole(r.key, playerRoles)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Base Price (₹) *</label>
            <input type="number" className="input" required min="0" step="100"
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
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              CricHeroes Profile URL <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input className="input" placeholder="https://cricheroes.com/player-profile/..."
              value={editForm.cricheroesProfileUrl}
              onChange={e => setEditForm(f => ({ ...f, cricheroesProfileUrl: e.target.value }))} />
          </div>
          {editingPlayer && (
            <div className="rounded-xl px-3 py-3"
              style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>CricHeroes Stats</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Cached stats are used on overlay. Fetch before going live.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={statsFetching || !isCricHeroesProfileUrl(editForm.cricheroesProfileUrl)}
                  onClick={handleFetchStats}
                >
                  <BarChart3 size={15} />
                  {statsFetching ? 'Fetching...' : 'Fetch Stats'}
                </button>
              </div>
              {hasPlayerStats(editingPlayer) && (
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  {[
                    ['Matches', editingPlayer.statsMatches],
                    ['Runs', editingPlayer.statsRuns],
                    ['SR', editingPlayer.statsStrikeRate],
                    ['Wickets', editingPlayer.statsWickets],
                    ['Economy', editingPlayer.statsEconomy],
                    ['Average', editingPlayer.statsAverage],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg px-2 py-2"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
                      <p className="text-sm font-black" style={{ color: 'var(--color-primary)' }}>{statValue(value)}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {[
                  ['statsMatches', 'Matches', '1'],
                  ['statsRuns', 'Runs', '1'],
                  ['statsStrikeRate', 'Strike Rate', '0.01'],
                  ['statsWickets', 'Wickets', '1'],
                  ['statsEconomy', 'Economy', '0.01'],
                  ['statsAverage', 'Average', '0.01'],
                ].map(([key, label, step]) => (
                  <label key={key} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {label}
                    <input
                      type="number"
                      className="input mt-1 !py-1.5 text-sm"
                      step={step}
                      min="0"
                      value={editForm[key]}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                If CricHeroes blocks backend fetching with 403, enter stats manually and save. These cached values are used by broadcaster overlays.
              </p>
            </div>
          )}
          <label className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
            <input
              type="checkbox"
              checked={editForm.retained}
              onChange={e => setEditForm(f => ({ ...f, retained: e.target.checked, teamId: e.target.checked ? f.teamId : '' }))}
            />
            Mark as retained player
          </label>
          {editForm.retained && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Retained Team <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <select className="input" value={editForm.teamId}
                onChange={e => setEditForm(f => ({ ...f, teamId: e.target.value }))}>
                <option value="">No team yet - keep available</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name} - remaining {team.remainingBudget?.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Selecting a team adds this player to that squad and deducts the base price from remaining budget.
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => { setEditingPlayer(null); setShowManualModal(false); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={editSaving}>
              {editSaving ? 'Saving…' : editingPlayer ? 'Save Changes' : 'Add Player'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
