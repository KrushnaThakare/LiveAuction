import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import AuditLogsPage from './pages/AuditLogsPage';
import PublicViewPage from './pages/PublicViewPage';
import OverlayMainPage from './pages/OverlayMainPage';
import OverlayTeamBudgetPage from './pages/OverlayTeamBudgetPage';
import OverlayTeamListPage from './pages/OverlayTeamListPage';
import OverlayTickerPage from './pages/OverlayTickerPage';
import OverlaySoldPage from './pages/OverlaySoldPage';
import OverlayUnsoldPage from './pages/OverlayUnsoldPage';
import OverlayBreakScreenPage from './pages/OverlayBreakScreenPage';
import AuctionDisplayPage from './pages/AuctionDisplayPage';
import BroadcastControlPage from './pages/BroadcastControlPage';
import LoadingSpinner from './components/common/LoadingSpinner';
import './styles/overlay.css';

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
      <Route path="/overlay/main" element={<OverlayMainPage />} />
      <Route path="/overlay/team-budget" element={<OverlayTeamBudgetPage />} />
      <Route path="/overlay/team-list" element={<OverlayTeamListPage />} />
      <Route path="/overlay/team-squad" element={<OverlayTeamListPage />} />
      <Route path="/overlay/ticker" element={<OverlayTickerPage />} />
      <Route path="/overlay/sold" element={<OverlaySoldPage />} />
      <Route path="/overlay/unsold" element={<OverlayUnsoldPage />} />
      <Route path="/overlay/break-screen" element={<OverlayBreakScreenPage />} />
      <Route path="/auction-display" element={<AuctionDisplayPage />} />
      <Route path="/display-screen" element={<AuctionDisplayPage />} />

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
              <Route path="/logs" element={
                <Protected requireSuperAdmin><AuditLogsPage /></Protected>
              } />
              <Route path="/broadcast" element={
                <Protected requireOperator><BroadcastControlPage /></Protected>
              } />
            </Routes>
          </main>
        </Protected>
      } />
    </Routes>
  );
}

function AppShell() {
  const location = useLocation();
  const isOverlay = location.pathname.startsWith('/overlay/');
  const isDisplay = location.pathname === '/auction-display' || location.pathname === '/display-screen';

  return (
    <div className="min-h-screen" style={{ backgroundColor: isOverlay ? 'transparent' : 'var(--color-background)' }}>
      <AppRoutes />
      {!isOverlay && !isDisplay && <Toaster position="top-right" toastOptions={toastOpts} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TournamentProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </TournamentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
