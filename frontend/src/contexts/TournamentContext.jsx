import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tournamentApi } from '../api/tournaments';

const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tournamentApi.getAll();
      const list = res.data.data || [];
      setTournaments(list);

      const savedId = localStorage.getItem('active-tournament-id');
      if (savedId) {
        const found = list.find((t) => t.id === parseInt(savedId, 10));
        if (found) setActiveTournament(found);
      } else if (list.length > 0 && !activeTournament) {
        setActiveTournament(list[0]);
      }
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const selectTournament = (tournament) => {
    setActiveTournament(tournament);
    localStorage.setItem('active-tournament-id', tournament.id);
  };

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        activeTournament,
        loading,
        fetchTournaments,
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
