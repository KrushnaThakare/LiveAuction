import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { TournamentProvider, useTournament } from './contexts/TournamentContext';
import { AuthProvider, useAuth, onLoginCallbacks } from './contexts/AuthContext';
import Navbar from './components/common/Navbar';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PlayersPage from './pages/PlayersPage';
import AuctionPage from './pages/AuctionPage';
import TeamsPage from './pages/TeamsPage';
import SoldPlayersPage from './pages/SoldPlayersPage';
import UnsoldPlayersPage from './pages/UnsoldPlayersPage';
import RegistrationSettingsPage from './pages/RegistrationSettingsPage';
import RegisteredPlayersPage from './pages/RegisteredPlayersPage';
import PublicRegistrationPage from './pages/PublicRegistrationPage';
import UsersPage from './pages/UsersPage';
import PublicViewPage from './pages/PublicViewPage';
import LoadingSpinner from './components/common/LoadingSpinner';

const toastOpts = {
  style: {
    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '14px',
  },
  success: { iconTheme: { primary: 'var(--color-success)', secondary: 'white' } },
  error:   { iconTheme: { primary: 'var(--color-danger)',  secondary: 'white' } },
};

/** Requires auth. If not logged in → redirect to /login */
function Protected({ children, requireOperator = false, requireSuperAdmin = false }) {
  const { user, loading, isOperator, isSuperAdmin } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (requireSuperAdmin && !isSuperAdmin) return <Navigate to="/" replace />;
  if (requireOperator   && !isOperator)   return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const { refreshTournaments } = useTournament();

  // Register callback so AuthContext can trigger refresh after login
  useEffect(() => {
    onLoginCallbacks.length = 0;
    onLoginCallbacks.push(refreshTournaments);
    return () => { onLoginCallbacks.length = 0; };
  }, [refreshTournaments]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-background)' }}>
      <LoadingSpinner size="lg" text="Loading…" />
    </div>
  );

  return (
    <Routes>
      {/* Fully public — no auth needed */}
      <Route path="/register/:tournamentId" element={<PublicRegistrationPage />} />
      <Route path="/view/:tournamentId"     element={<PublicViewPage />} />

      {/* Auth */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* Auction — full screen, operator+ */}
      <Route path="/auction" element={
        <Protected requireOperator>
          <Navbar />
          <AuctionPage />
        </Protected>
      } />

      {/* All admin pages */}
      <Route path="/*" element={
        <Protected>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/sold" element={<SoldPlayersPage />} />
              <Route path="/unsold" element={<UnsoldPlayersPage />} />
              {/* Operator+ */}
              <Route path="/registrations" element={
                <Protected requireOperator><RegisteredPlayersPage /></Protected>
              } />
              {/* Super-admin only */}
              <Route path="/registration" element={
                <Protected requireSuperAdmin><RegistrationSettingsPage /></Protected>
              } />
              <Route path="/users" element={
                <Protected requireSuperAdmin><UsersPage /></Protected>
              } />
            </Routes>
          </main>
        </Protected>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TournamentProvider>
          <BrowserRouter>
            <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
              <AppRoutes />
              <Toaster position="top-right" toastOptions={toastOpts} />
            </div>
          </BrowserRouter>
        </TournamentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
