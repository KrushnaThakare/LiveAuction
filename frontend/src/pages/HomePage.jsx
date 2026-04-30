import { useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { tournamentApi } from '../api/tournaments';
import Modal from '../components/common/Modal';
import TournamentForm from '../components/tournaments/TournamentForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import toast from 'react-hot-toast';
import { Trophy, Plus, Users, ShieldCheck, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';

export default function HomePage() {
  const { tournaments, loading, fetchTournaments, selectTournament, activeTournament } = useTournament();

  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [editForm, setEditForm]                 = useState({ name: '', description: '' });
  const [editSaving, setEditSaving]             = useState(false);

  const openEdit = (e, t) => {
    e.stopPropagation();
    setEditingTournament(t);
    setEditForm({ name: t.name, description: t.description || '' });
  };

  const handleEditSave = async (ev) => {
    ev.preventDefault();
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    setEditSaving(true);
    try {
      await tournamentApi.update(editingTournament.id, editForm);
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
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />New Tournament
        </button>
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
              {/* Edit / Delete buttons — revealed on hover */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => openEdit(e, t)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}
                  title="Edit tournament"
                >
                  <Edit size={13} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, t)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}
                  title="Delete tournament"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary)', opacity: 0.9 }}>
                  <Trophy size={22} color="white" />
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
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name *</label>
            <input className="input" required value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
            <textarea className="input resize-none" rows={3} value={editForm.description}
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
