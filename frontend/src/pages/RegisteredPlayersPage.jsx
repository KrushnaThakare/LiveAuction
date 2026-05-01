import { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { registrationApi } from '../api/registration';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { Users, Import, Trash2, Search, CheckCircle, Clock, Edit, Upload } from 'lucide-react';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace('/api', '');

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith('/api') ? API_ORIGIN + url : url;
}

export default function RegisteredPlayersPage() {
  const { activeTournament } = useTournament();
  const [registrations, setRegistrations]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [importing, setImporting]           = useState(false);

  // Edit modal
  const [editTarget, setEditTarget]         = useState(null);
  const [editForm, setEditForm]             = useState({ playerName: '', mobile: '', formData: {} });
  const [editPhoto, setEditPhoto]           = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [editSaving, setEditSaving]         = useState(false);

  const fetchReg = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const res = await registrationApi.getRegistrations(activeTournament.id);
      setRegistrations(res.data.data || []);
    } finally { setLoading(false); }
  }, [activeTournament]);

  useEffect(() => { fetchReg(); }, [fetchReg]);

  /* ── Import one — direct confirm ── */
  const handleImportOne = async (reg) => {
    if (!confirm(`Import "${reg.playerName || 'this player'}" to the auction?\n\nBase price: ₹1,000\nAll details will be copied as submitted.`)) return;
    setImporting(true);
    try {
      await registrationApi.importOne(activeTournament.id, reg.id);
      toast.success(`${reg.playerName || 'Player'} added to auction!`);
      fetchReg();
    } finally { setImporting(false); }
  };

  /* ── Import all — direct confirm ── */
  const handleImportAll = async () => {
    const pending = registrations.filter(r => r.status === 'PENDING');
    if (pending.length === 0) { toast.error('No pending registrations to import'); return; }
    if (!confirm(`Import all ${pending.length} pending players to the auction?\n\nBase price: ₹1,000 for all players.`)) return;
    setImporting(true);
    try {
      const res = await registrationApi.importAll(activeTournament.id);
      toast.success(res.data.message);
      fetchReg();
    } finally { setImporting(false); }
  };

  /* ── Delete ── */
  const handleDelete = async (reg) => {
    if (!confirm(`Delete registration for "${reg.playerName || 'this player'}"?`)) return;
    await registrationApi.deleteReg(activeTournament.id, reg.id);
    toast.success('Registration deleted');
    fetchReg();
  };

  /* ── Open edit ── */
  const openEdit = (reg) => {
    let fd = {};
    try { fd = JSON.parse(reg.formData || '{}'); } catch { /* ignore */ }
    setEditTarget(reg);
    setEditForm({ playerName: reg.playerName || '', mobile: reg.mobile || '', formData: fd });
    setEditPhoto(null);
    setEditPhotoPreview(resolveUrl(reg.photoUrl));
  };

  const handleEditPhotoChange = (file) => {
    if (!file) return;
    setEditPhoto(file);
    const reader = new FileReader();
    reader.onload = e => setEditPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Save edit ── */
  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await registrationApi.editReg(
        activeTournament.id, editTarget.id,
        editForm.playerName, editForm.mobile, editForm.formData,
        editPhoto
      );
      toast.success('Registration updated');
      setEditTarget(null);
      fetchReg();
    } finally { setEditSaving(false); }
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

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Registered Players
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {activeTournament.name} · {registrations.length} total · {pendingCount} pending
          </p>
        </div>
        {pendingCount > 0 && (
          <button onClick={handleImportAll} disabled={importing} className="btn-primary">
            <Import size={15} /> Import All ({pendingCount}) to Auction
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total',    value: registrations.length,                                         color: 'var(--color-primary)', icon: Users },
          { label: 'Pending',  value: pendingCount,                                                 color: 'var(--color-warning)', icon: Clock },
          { label: 'Imported', value: registrations.filter(r => r.status === 'IMPORTED').length,   color: 'var(--color-success)', icon: CheckCircle },
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
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-secondary)' }} />
        <input className="input pl-9" placeholder="Search by name or mobile…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No registrations yet"
          description="Share the registration link to collect player data." />
      ) : (
        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-12 text-xs font-bold uppercase px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            <div className="col-span-1">Photo</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Mobile</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Actions</div>
          </div>

          {filtered.map(reg => {
            const photo = resolveUrl(reg.photoUrl);
            const formData = (() => { try { return JSON.parse(reg.formData || '{}'); } catch { return {}; } })();

            return (
              <div key={reg.id}
                className="grid grid-cols-12 items-center px-4 py-3 rounded-xl transition-all"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

                {/* Photo */}
                <div className="col-span-1">
                  {photo ? (
                    <img src={photo} alt={reg.playerName}
                      className="w-10 h-10 rounded-xl object-cover object-top" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                      style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-primary)' }}>
                      {(reg.playerName || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name + extra fields */}
                <div className="col-span-3">
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {reg.playerName || '—'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {Object.entries(formData).slice(0, 2).map(([, v]) => v).filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Mobile */}
                <div className="col-span-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {reg.mobile || '—'}
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <StatusBadge status={reg.status} />
                </div>

                {/* Date */}
                <div className="col-span-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {reg.submittedAt ? new Date(reg.submittedAt).toLocaleDateString('en-IN') : '—'}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center gap-1">
                  <button onClick={() => openEdit(reg)}
                    className="btn-secondary !px-2 !py-1 text-xs" title="Edit registration">
                    <Edit size={12} /> Edit
                  </button>
                  {reg.status === 'PENDING' && (
                    <button onClick={() => handleImportOne(reg)} disabled={importing}
                      className="btn-primary !px-2 !py-1 text-xs" title="Import to auction">
                      <Import size={12} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(reg)} title="Delete"
                    className="!p-1.5 rounded-lg hover:bg-white/10">
                    <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)}
          title={`Edit — ${editTarget.playerName || 'Registration'}`} size="lg">
          <div className="space-y-4">

            {/* Photo */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 relative"
                style={{ backgroundColor: 'var(--color-surface-2)' }}>
                {editPhotoPreview ? (
                  <img src={editPhotoPreview} alt="Photo"
                    className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black"
                    style={{ color: 'var(--color-primary)' }}>
                    {(editForm.playerName || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Player Photo
                </p>
                <label className="btn-secondary cursor-pointer text-sm">
                  <Upload size={14} /> Change Photo
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => handleEditPhotoChange(e.target.files?.[0])} />
                </label>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Player Name
              </label>
              <input className="input" value={editForm.playerName}
                onChange={e => setEditForm(f => ({ ...f, playerName: e.target.value }))} />
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Mobile Number
              </label>
              <input className="input" value={editForm.mobile}
                onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} />
            </div>

            {/* All other form fields */}
            {Object.entries(editForm.formData).map(([key, val]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1 capitalize"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  {key.replace(/_/g, ' ')}
                </label>
                <input className="input" value={Array.isArray(val) ? val.join(', ') : (val || '')}
                  onChange={e => setEditForm(f => ({
                    ...f, formData: { ...f.formData, [key]: e.target.value }
                  }))} />
              </div>
            ))}

            <div className="flex gap-3 justify-end pt-2">
              <button className="btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
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
