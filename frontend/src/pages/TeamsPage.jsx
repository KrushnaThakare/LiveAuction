import { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../contexts/TournamentContext';
import { teamApi } from '../api/teams';
import TeamForm from '../components/teams/TeamForm';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { formatCurrency, formatRole, getRoleColor, getRoleBg } from '../utils/formatters';
import { exportTeamRosters } from '../utils/teamExport';
import toast from 'react-hot-toast';
import { ShieldCheck, Plus, Edit, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';

const TEAM_ACCENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6',
];

export default function TeamsPage() {
  const { activeTournament } = useTournament();

  const [teams, setTeams]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [editingTeam, setEditingTeam]   = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamLogoFile, setTeamLogoFile] = useState(null);

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
      let teamId;
      if (editingTeam) {
        await teamApi.update(activeTournament.id, editingTeam.id, formData);
        teamId = editingTeam.id;
        toast.success('Team updated!');
      } else {
        const res = await teamApi.create(activeTournament.id, formData);
        teamId = res.data.data?.id;
        toast.success('Team created!');
      }
      // Upload logo if selected
      if (teamLogoFile && teamId) {
        await teamApi.uploadLogo(activeTournament.id, teamId, teamLogoFile);
        setTeamLogoFile(null);
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

  const handleExport = () => {
    if (teams.length === 0) { toast.error('No teams to export'); return; }
    exportTeamRosters(teams, activeTournament?.name);
  };

  if (!activeTournament) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <EmptyState icon={ShieldCheck} title="No tournament selected" description="Select a tournament first." />
      </div>
    );
  }

  const totalBudget = teams.reduce((s, t) => s + t.budget, 0);
  const totalSpent  = teams.reduce((s, t) => s + (t.budget - t.remainingBudget), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Teams</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{activeTournament.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {teams.length > 0 && (
            <button className="btn-secondary" onClick={handleExport}>
              <Download size={15} />
              Export Rosters
            </button>
          )}
          <button className="btn-primary" onClick={() => { setEditingTeam(null); setTeamLogoFile(null); setShowModal(true); }}>
            <Plus size={15} />New Team
          </button>
        </div>
      </div>

      {/* Budget Overview */}
      {teams.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Budget Overview</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <BudgetStat label="Total Budget"  value={formatCurrency(totalBudget)} color="var(--color-primary)" />
            <BudgetStat label="Spent"         value={formatCurrency(totalSpent)} color="var(--color-danger)" />
            <BudgetStat label="Remaining"     value={formatCurrency(totalBudget - totalSpent)} color="var(--color-success)" />
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: totalBudget ? `${(totalSpent / totalBudget) * 100}%` : '0%', backgroundColor: 'var(--color-primary)' }}
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
          {teams.map((team, idx) => (
            <TeamCard
              key={team.id}
              team={team}
              accentColor={TEAM_ACCENT_COLORS[idx % TEAM_ACCENT_COLORS.length]}
              expanded={expandedTeam === team.id}
              onToggle={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
              onEdit={() => { setEditingTeam(team); setTeamLogoFile(null); setShowModal(true); }}
              onDelete={() => handleDelete(team.id)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTeam(null); setTeamLogoFile(null); }}
        title={editingTeam ? 'Edit Team' : 'Create Team'}
      >
        <TeamForm
          initialData={editingTeam ? { name: editingTeam.name, logoUrl: editingTeam.logoUrl || '', budget: editingTeam.budget } : null}
          logoFile={teamLogoFile}
          onLogoChange={setTeamLogoFile}
          onSubmit={handleSubmit}
          onCancel={() => { setShowModal(false); setEditingTeam(null); setTeamLogoFile(null); }}
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

function TeamCard({ team, accentColor, expanded, onToggle, onEdit, onDelete }) {
  const budgetUsed = team.budget - team.remainingBudget;
  const pct = team.budget ? (budgetUsed / team.budget) * 100 : 0;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg transition-all duration-200"
      style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border)` }}
    >
      {/* Color accent bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />

      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Logo — bigger, classic crest style */}
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-lg"
            style={{
              background: `radial-gradient(circle at 40% 40%, ${accentColor}cc, ${accentColor}44)`,
              border: `2px solid ${accentColor}`,
              color: 'white',
            }}
          >
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            ) : null}
            <span style={{ display: team.logoUrl ? 'none' : 'flex' }}>{team.name[0]}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-black text-lg leading-tight truncate" style={{ color: accentColor }}>
                  {team.name}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {team.playerCount} player{team.playerCount !== 1 ? 's' : ''} acquired
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                  <Edit size={14} style={{ color: 'var(--color-text-secondary)' }} />
                </button>
                <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                  <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                </button>
              </div>
            </div>

            {/* Budget details */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Budget</p>
                <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(team.budget)}</p>
              </div>
              <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Remaining</p>
                <p className="font-bold text-sm" style={{ color: 'var(--color-success)' }}>{formatCurrency(team.remainingBudget)}</p>
              </div>
            </div>

            {/* Budget bar */}
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface-2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: pct > 80 ? 'var(--color-danger)' : accentColor }}
              />
            </div>
            <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-text-secondary)' }}>
              {pct.toFixed(0)}% spent
            </p>
          </div>
        </div>

        {/* Toggle players */}
        {team.playerCount > 0 && (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-1 mt-3 pt-3 text-xs font-medium transition-all"
            style={{ borderTop: '1px solid var(--color-border)', color: accentColor }}
          >
            {expanded ? 'Hide' : 'Show'} squad
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}

        {/* Player roster */}
        {expanded && team.players && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {team.players.map((p) => {
              const rc  = getRoleColor(p.role);
              const rbg = getRoleBg(p.role);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: rbg, color: rc }}
                  >
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      : p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{p.name}</p>
                    <p className="text-xs" style={{ color: rc, opacity: 0.8 }}>{formatRole(p.role)}</p>
                  </div>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
                    {formatCurrency(p.currentBid)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
