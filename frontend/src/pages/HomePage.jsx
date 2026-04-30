import { useState } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import Modal from '../components/common/Modal';
import TournamentForm from '../components/tournaments/TournamentForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { Trophy, Plus, Users, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';

export default function HomePage() {
  const { tournaments, loading, fetchTournaments, selectTournament, activeTournament } = useTournament();
  const [showModal, setShowModal] = useState(false);

  const handleSuccess = () => {
    setShowModal(false);
    fetchTournaments();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Tournaments
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Manage your cricket auction tournaments
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          New Tournament
        </button>
      </div>

      {/* Stats banner */}
      <div
        className="rounded-2xl p-6 mb-8 bg-gradient-to-r"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
          <div className="text-center">
            <p className="text-3xl font-bold">{tournaments.length}</p>
            <p className="text-sm opacity-80">Tournaments</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">
              {tournaments.reduce((s, t) => s + t.totalTeams, 0)}
            </p>
            <p className="text-sm opacity-80">Teams</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">
              {tournaments.reduce((s, t) => s + t.totalPlayers, 0)}
            </p>
            <p className="text-sm opacity-80">Players</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">
              {tournaments.reduce((s, t) => s + t.soldPlayers, 0)}
            </p>
            <p className="text-sm opacity-80">Sold</p>
          </div>
        </div>
      </div>

      {/* Tournament Cards */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" text="Loading tournaments..." />
        </div>
      ) : tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments yet"
          description="Create your first cricket auction tournament to get started."
          action={
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              Create Tournament
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="card-hover cursor-pointer"
              style={
                activeTournament?.id === t.id
                  ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 2px var(--color-primary)' }
                  : {}
              }
              onClick={() => selectTournament(t)}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary)', opacity: 0.9 }}
                >
                  <Trophy size={22} color="white" />
                </div>
                {activeTournament?.id === t.id && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                    }}
                  >
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {t.name}
              </h3>
              {t.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {t.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <StatChip icon={Users} label="Players" value={t.totalPlayers} />
                <StatChip icon={ShieldCheck} label="Teams" value={t.totalTeams} />
                <StatChip icon={CheckCircle} label="Sold" value={t.soldPlayers} color="var(--color-sold)" />
                <StatChip icon={XCircle} label="Unsold" value={t.unsoldPlayers} color="var(--color-unsold)" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Tournament">
        <TournamentForm onSuccess={handleSuccess} onCancel={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, color }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
      style={{ backgroundColor: 'var(--color-surface-2)' }}
    >
      <Icon size={13} style={{ color: color || 'var(--color-text-secondary)' }} />
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="text-xs font-semibold ml-auto" style={{ color: color || 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
  );
}
