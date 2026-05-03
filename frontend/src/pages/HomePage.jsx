import { useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { tournamentApi } from '../api/tournaments';
import Modal from '../components/common/Modal';
import TournamentForm from '../components/tournaments/TournamentForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { Trophy, Plus, Users, ShieldCheck, CheckCircle, XCircle, Edit, Trash2, Upload, Share2 } from 'lucide-react';
import { resolveUrl } from '../utils/resolveUrl';
import { useAuth } from '../contexts/AuthContext';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

export default function HomePage() {
  const { tournaments, loading, fetchTournaments, selectTournament, activeTournament } = useTournament();
  const { isSuperAdmin } = useAuth();

  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [editForm, setEditForm]                 = useState({ name: '', description: '' });
  const [editLogoFile, setEditLogoFile]         = useState(null);
  const [editLogoPreview, setEditLogoPreview]   = useState(null);
  const [editSaving, setEditSaving]             = useState(false);

  const openEdit = (e, t) => {
    e.stopPropagation();
    setEditingTournament(t);
    setEditForm({ name: t.name, description: t.description || '' });
    setEditLogoFile(null);
    setEditLogoPreview(resolveUrl(t.logoUrl));
  };

  const handleEditSave = async (ev) => {
    ev.preventDefault();
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    setEditSaving(true);
    try {
      await tournamentApi.update(editingTournament.id, editForm);
      if (editLogoFile) {
        await tournamentApi.uploadLogo(editingTournament.id, editLogoFile);
      }
      toast.success('Tournament updated');
      setEditingTournament(null);
      fetchTournaments();
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (e, t) => {
    e.stopPropagation();
    if (!confirm(`Delete "${t.name}"? All players and teams will be permanently deleted.`)) return;
    try {
      await tournamentApi.delete(t.id);
      toast.success('Tournament deleted');
      fetchTournaments();
    } catch { /* handled */ }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Tournaments</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Manage your cricket auction tournaments
          </p>
        </div>
        {isSuperAdmin && (
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />New Tournament
          </button>
        )}
      </div>

      {/* Stats banner */}
      <div className="rounded-2xl p-6 mb-8"
        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
          {[
            { label: 'Tournaments', value: tournaments.length },
            { label: 'Teams',       value: tournaments.reduce((s, t) => s + t.totalTeams, 0) },
            { label: 'Players',     value: tournaments.reduce((s, t) => s + t.totalPlayers, 0) },
            { label: 'Sold',        value: tournaments.reduce((s, t) => s + t.soldPlayers, 0) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tournament Cards */}
      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="lg" text="Loading tournaments..." /></div>
      ) : tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments yet"
          description="Create your first cricket auction tournament to get started."
          action={
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />Create Tournament
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="card-hover cursor-pointer group relative"
              style={activeTournament?.id === t.id
                ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 2px var(--color-primary)' }
                : {}}
              onClick={() => selectTournament(t)}
            >
              {/* Action buttons top-right */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => openEdit(e, t)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}
                  title="Edit tournament"
                  style={{ display: isSuperAdmin ? undefined : 'none', backgroundColor: 'var(--color-surface-2)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}
                >
                  <Edit size={13} />
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={(e) => handleDelete(e, t)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}
                    title="Delete tournament"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}/view/${t.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Broadcast link copied!');
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-success)', border: '1px solid var(--color-border)' }}
                  title="Copy broadcast link (no login needed)"
                >
                  <Share2 size={13} />
                </button>
              </div>

              <div className="flex items-start justify-between mb-4">
                {/* Tournament Logo or default trophy */}
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)', opacity: 0.9 }}>
                  {t.logoUrl ? (
                    <img
                      src={resolveUrl(t.logoUrl)}
                      alt={t.name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display='none'; }}
                    />
                  ) : (
                    <Trophy size={22} color="white" />
                  )}
                </div>
                {activeTournament?.id === t.id && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full mr-16"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    Active
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t.name}</h3>
              {t.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{t.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <StatChip icon={Users}         label="Players" value={t.totalPlayers} />
                <StatChip icon={ShieldCheck}   label="Teams"   value={t.totalTeams} />
                <StatChip icon={CheckCircle}   label="Sold"    value={t.soldPlayers}   color="var(--color-sold)" />
                <StatChip icon={XCircle}       label="Unsold"  value={t.unsoldPlayers} color="var(--color-unsold)" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Tournament">
        <TournamentForm
          onSuccess={() => { setShowCreateModal(false); fetchTournaments(); }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editingTournament} onClose={() => setEditingTournament(null)} title="Edit Tournament">
        <form onSubmit={handleEditSave} className="space-y-4">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Tournament Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center font-bold flex-shrink-0"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                {editLogoPreview
                  ? <img src={editLogoPreview} alt="Logo" className="w-full h-full object-cover" />
                  : <Trophy size={20} color="white" />}
              </div>
              <label className="btn-secondary cursor-pointer text-sm">
                <Upload size={14} />
                {editLogoFile ? editLogoFile.name : 'Change Logo'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setEditLogoFile(file);
                    const reader = new FileReader();
                    reader.onload = ev => setEditLogoPreview(ev.target.result);
                    reader.readAsDataURL(file);
                  }} />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name *</label>
            <input className="input" required value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
            <textarea className="input resize-none" rows={2} value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditingTournament(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-surface-2)' }}>
      <Icon size={13} style={{ color: color || 'var(--color-text-secondary)' }} />
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="text-xs font-semibold ml-auto" style={{ color: color || 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}
