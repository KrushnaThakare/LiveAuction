import { useState } from 'react';
import { useTournament } from '../../contexts/TournamentContext';
import { ChevronDown, Trophy } from 'lucide-react';

export default function TournamentSelector() {
  const { tournaments, activeTournament, selectTournament } = useTournament();
  const [open, setOpen] = useState(false);

  if (!activeTournament) {
    return (
      <div
        className="text-xs px-3 py-2 rounded-lg"
        style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}
      >
        No tournament
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
      >
        <Trophy size={14} style={{ color: 'var(--color-primary)' }} />
        <span className="max-w-28 truncate">{activeTournament.name}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 p-2 rounded-xl shadow-2xl z-50 w-56"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-xs font-semibold px-2 pb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Tournaments
          </p>
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => { selectTournament(t); setOpen(false); }}
              className="w-full text-left px-2 py-2 rounded-lg text-sm transition-all duration-150"
              style={{
                color: activeTournament?.id === t.id ? 'var(--color-primary)' : 'var(--color-text-primary)',
                backgroundColor: activeTournament?.id === t.id ? 'var(--color-surface-2)' : 'transparent',
              }}
            >
              <span className="font-medium">{t.name}</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {t.totalPlayers} players • {t.totalTeams} teams
              </span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
