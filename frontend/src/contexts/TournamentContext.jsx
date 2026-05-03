import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tournamentApi } from '../api/tournaments';

const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  const [tournaments, setTournaments]         = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [fetchTrigger, setFetchTrigger]       = useState(0);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tournamentApi.getAll();
      const list = res.data.data || [];
      setTournaments(list);

      const savedId = localStorage.getItem('active-tournament-id');
      if (savedId) {
        const found = list.find((t) => t.id === parseInt(savedId, 10));
        if (found) {
          setActiveTournament(found);
        } else {
          localStorage.removeItem('active-tournament-id');
          if (list.length > 0) {
            setActiveTournament(list[0]);
            localStorage.setItem('active-tournament-id', list[0].id);
          } else {
            setActiveTournament(null);
          }
        }
      } else if (list.length > 0) {
        setActiveTournament(list[0]);
        localStorage.setItem('active-tournament-id', list[0].id);
      }
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever triggered (on mount + after login)
  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments, fetchTrigger]);

  // Trigger a manual refresh (called from AuthContext after login)
  const refreshTournaments = useCallback(() => {
    setFetchTrigger(t => t + 1);
  }, []);

  const selectTournament = (tournament) => {
    setActiveTournament(tournament);
    localStorage.setItem('active-tournament-id', String(tournament.id));
  };

  // Keep activeTournament data fresh when the list is refreshed
  useEffect(() => {
    if (!activeTournament || tournaments.length === 0) return;
    const fresh = tournaments.find(t => t.id === activeTournament.id);
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(activeTournament)) {
      setActiveTournament(fresh);
    }
  }, [tournaments]);

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        activeTournament,
        loading,
        fetchTournaments,
        refreshTournaments,
        selectTournament,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export const useTournament = () => {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
  return ctx;
};
