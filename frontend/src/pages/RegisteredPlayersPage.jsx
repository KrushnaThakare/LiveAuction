import { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { registrationApi } from '../api/registration';
import { formatCurrency } from '../utils/formatters';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { Users, Import, Trash2, Search, CheckCircle, Clock, XCircle, Download } from 'lucide-react';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace('/api', '');

const ROLES = ['BATSMAN','BOWLER','ALL_ROUNDER','WICKET_KEEPER'];

function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith('/api')) return API_ORIGIN + url;
  return url;
}

export default function RegisteredPlayersPage() {
  const { activeTournament } = useTournament();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTarget, setImportTarget] = useState(null); // null = bulk
  const [importForm, setImportForm] = useState({ role: 'BATSMAN', basePrice: 1000 });
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchReg = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const res = await registrationApi.getRegistrations(activeTournament.id);
      setRegistrations(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchReg(); }, [fetchReg]);

  const handleImport = async () => {
    if (!activeTournament) return;
    setImporting(true);
    try {
      if (importTarget) {
        await registrationApi.importOne(activeTournament.id, importTarget.id, importForm);
        toast.success(`${importTarget.playerName || 'Player'} imported to auction!`);
      } else {
        const res = await registrationApi.importAll(activeTournament.id, importForm.basePrice);
        toast.success(res.data.message);
      }
      setShowImportModal(false);
      fetchReg();
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (reg) => {
    if (!confirm(`Delete registration for ${reg.playerName || 'this player'}?`)) return;
    await registrationApi.deleteReg(activeTournament.id, reg.id);
    toast.success('Registration deleted');
    fetchReg();
  };

  const openImportOne = (reg) => {
    setImportTarget(reg);
    setImportForm({ role: 'BATSMAN', basePrice: 1000 });
    setShowImportModal(true);
  };

  const openBulkImport = () => {
    setImportTarget(null);
    setImportForm({ role: 'BATSMAN', basePrice: 1000 });
    setShowImportModal(true);
  };

  const filtered = registrations.filter(r =>
    !search ||
    (r.playerName || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.mobile || '').includes(search)
  );

  const pendingCount = registrations.filter(r => r.status === 'PENDING').length;

  if (!activeTournament) {
    return <div className="max-w-6xl mx-auto px-4 py-8">
      <EmptyState icon={Users} title="No tournament selected" />
    </div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Registered Players
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {activeTournament.name} · {registrations.length} total · {pendingCount} pending import
          </p>
        </div>
        {pendingCount > 0 && (
          <button onClick={openBulkImport} className="btn-primary">
            <Import size={15} /> Import All ({pendingCount}) to Auction
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', value: registrations.length, color: 'var(--color-primary)', icon: Users },
          { label: 'Pending', value: pendingCount, color: 'var(--color-warning)', icon: Clock },
          { label: 'Imported', value: registrations.filter(r => r.status === 'IMPORTED').length, color: 'var(--color-success)', icon: CheckCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-3">
            <Icon size={20} style={{ color }} />
            <div>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
        <input className="input pl-9" placeholder="Search by name or mobile…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No registrations yet"
          description="Share the registration link to start collecting player data." />
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 text-xs font-bold uppercase px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            <div className="col-span-1">Photo</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Mobile</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Submitted</div>
            <div className="col-span-2">Actions</div>
          </div>

          {filtered.map(reg => {
            const photo = resolveUrl(reg.photoUrl);
            const formData = (() => { try { return JSON.parse(reg.formData || '{}'); } catch { return {}; } })();

            return (
              <div key={reg.id}
                className="grid grid-cols-12 items-center px-4 py-3 rounded-xl transition-all"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

                <div className="col-span-1">
                  {photo ? (
                    <img src={photo} alt={reg.playerName}
                      className="w-10 h-10 rounded-xl object-cover object-top" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-primary)' }}>
                      {(reg.playerName || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="col-span-3">
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {reg.playerName || '—'}
                  </p>
                  {Object.keys(formData).length > 0 && (
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {Object.entries(formData).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                </div>

                <div className="col-span-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {reg.mobile || '—'}
                </div>

                <div className="col-span-2">
                  <StatusBadge status={reg.status} />
                </div>

                <div className="col-span-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {reg.submittedAt ? new Date(reg.submittedAt).toLocaleDateString() : '—'}
                </div>

                <div className="col-span-2 flex items-center gap-1">
                  {reg.status === 'PENDING' && (
                    <button onClick={() => openImportOne(reg)}
                      className="btn-primary !px-2 !py-1 text-xs" title="Import to Auction">
                      <Import size={12} /> Import
                    </button>
                  )}
                  <button onClick={() => handleDelete(reg)}
                    className="!p-1.5 rounded-lg hover:bg-white/10" title="Delete">
                    <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)}
        title={importTarget ? `Import ${importTarget.playerName || 'Player'}` : `Bulk Import ${pendingCount} Players`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Player Role
            </label>
            <select className="input" value={importForm.role}
              onChange={e => setImportForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              If a role field was mapped in the form, it will override this for each player.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Base Price (₹)
            </label>
            <input type="number" className="input" value={importForm.basePrice} min="100"
              onChange={e => setImportForm(f => ({ ...f, basePrice: parseFloat(e.target.value) }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? 'Importing…' : (importTarget ? 'Import Player' : `Import All ${pendingCount}`)}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    PENDING:  { label: 'Pending',  color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.15)' },
    IMPORTED: { label: 'Imported', color: 'var(--color-success)', bg: 'rgba(16,185,129,0.15)' },
    REJECTED: { label: 'Rejected', color: 'var(--color-danger)',  bg: 'rgba(239,68,68,0.15)' },
  }[status] || { label: status, color: 'var(--color-text-secondary)', bg: 'transparent' };

  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}` }}>
      {cfg.label}
    </span>
  );
}
