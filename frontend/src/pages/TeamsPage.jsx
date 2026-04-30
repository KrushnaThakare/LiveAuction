import { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { teamApi } from '../api/teams';
import TeamForm from '../components/teams/TeamForm';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { formatCurrency, formatRole } from '../utils/formatters';
import toast from 'react-hot-toast';
import { ShieldCheck, Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function TeamsPage() {
  const { activeTournament } = useTournament();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);

  const fetchTeams = useCallback(async () => {
    if (!activeTournament) return;
    setLoading(true);
    try {
      const res = await teamApi.getAll(activeTournament.id);
      setTeams(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeTournament]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleSubmit = async (formData) => {
    if (!activeTournament) return;
    setSaving(true);
    try {
      if (editingTeam) {
        await teamApi.update(activeTournament.id, editingTeam.id, formData);
        toast.success('Team updated!');
      } else {
        await teamApi.create(activeTournament.id, formData);
        toast.success('Team created!');
      }
      setShowModal(false);
      setEditingTeam(null);
      fetchTeams();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teamId) => {
    if (!confirm('Delete this team? All player assignments will be cleared.')) return;
    try {
      await teamApi.delete(activeTournament.id, teamId);
      toast.success('Team deleted');
      fetchTeams();
    } catch { /* handled */ }
  };

  if (!activeTournament) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState icon={ShieldCheck} title="No tournament selected" description="Select a tournament first." />
      </div>
    );
  }

  const totalBudget = teams.reduce((s, t) => s + t.budget, 0);
  const totalSpent = teams.reduce((s, t) => s + (t.budget - t.remainingBudget), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Teams</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{activeTournament.name}</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingTeam(null); setShowModal(true); }}>
          <Plus size={16} />New Team
        </button>
      </div>

      {/* Budget Overview */}
      {teams.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Budget Overview</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <BudgetStat label="Total Budget" value={formatCurrency(totalBudget)} color="var(--color-primary)" />
            <BudgetStat label="Spent" value={formatCurrency(totalSpent)} color="var(--color-danger)" />
            <BudgetStat label="Remaining" value={formatCurrency(totalBudget - totalSpent)} color="var(--color-success)" />
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: totalBudget ? `${(totalSpent / totalBudget) * 100}%` : '0%',
                backgroundColor: 'var(--color-primary)',
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="lg" text="Loading teams..." /></div>
      ) : teams.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No teams yet" description="Create teams to participate in the auction."
          action={<button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={16} />Create Team</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              expanded={expandedTeam === team.id}
              onToggle={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
              onEdit={() => { setEditingTeam(team); setShowModal(true); }}
              onDelete={() => handleDelete(team.id)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTeam(null); }}
        title={editingTeam ? 'Edit Team' : 'Create Team'}
      >
        <TeamForm
          initialData={editingTeam ? { name: editingTeam.name, logoUrl: editingTeam.logoUrl || '', budget: editingTeam.budget } : null}
          onSubmit={handleSubmit}
          onCancel={() => { setShowModal(false); setEditingTeam(null); }}
          loading={saving}
        />
      </Modal>
    </div>
  );
}

function BudgetStat({ label, value, color }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function TeamCard({ team, expanded, onToggle, onEdit, onDelete }) {
  const budgetUsed = team.budget - team.remainingBudget;
  const pct = team.budget ? (budgetUsed / team.budget) * 100 : 0;

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        {/* Logo / Initial */}
        <div
          className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
        >
          {team.logoUrl ? (
            <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : team.name[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{team.name}</h3>
            <div className="flex items-center gap-1 ml-2">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                <Edit size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm">
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Budget: <strong style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(team.budget)}</strong>
            </span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Remaining: <strong style={{ color: 'var(--color-success)' }}>{formatCurrency(team.remainingBudget)}</strong>
            </span>
          </div>

          {/* Budget Bar */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: pct > 80 ? 'var(--color-danger)' : 'var(--color-primary)' }}
            />
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {team.playerCount} player{team.playerCount !== 1 ? 's' : ''}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {pct.toFixed(0)}% spent
            </span>
          </div>
        </div>
      </div>

      {/* Players List Toggle */}
      {team.playerCount > 0 && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-1 mt-3 pt-3 text-xs"
          style={{
            borderTop: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {expanded ? 'Hide' : 'Show'} players
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}

      {expanded && team.players && (
        <div className="mt-3 space-y-1">
          {team.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
              style={{ backgroundColor: 'var(--color-surface-2)' }}
            >
              <span style={{ color: 'var(--color-text-primary)' }}>{p.name}</span>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--color-text-secondary)' }}>{formatRole(p.role)}</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{formatCurrency(p.currentBid)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
