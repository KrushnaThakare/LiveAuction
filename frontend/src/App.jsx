import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { TournamentProvider } from './contexts/TournamentContext';
import Navbar from './components/common/Navbar';
import HomePage from './pages/HomePage';
import PlayersPage from './pages/PlayersPage';
import AuctionPage from './pages/AuctionPage';
import TeamsPage from './pages/TeamsPage';
import SoldPlayersPage from './pages/SoldPlayersPage';
import UnsoldPlayersPage from './pages/UnsoldPlayersPage';
import RegistrationSettingsPage from './pages/RegistrationSettingsPage';
import RegisteredPlayersPage from './pages/RegisteredPlayersPage';
import PublicRegistrationPage from './pages/PublicRegistrationPage';

const toastOpts = {
  style: {
    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '14px',
  },
  success: { iconTheme: { primary: 'var(--color-success)', secondary: 'white' } },
  error:   { iconTheme: { primary: 'var(--color-danger)',  secondary: 'white' } },
};

export default function App() {
  return (
    <ThemeProvider>
      <TournamentProvider>
        <BrowserRouter>
          <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
            <Routes>
              {/* Public registration page — no navbar */}
              <Route path="/register/:tournamentId" element={<PublicRegistrationPage />} />

              {/* Auction — full screen */}
              <Route path="/auction" element={<><Navbar /><AuctionPage /></>} />

              {/* All other admin pages */}
              <Route path="/*" element={
                <>
                  <Navbar />
                  <main>
                    <Routes>
                      <Route path="/"             element={<HomePage />} />
                      <Route path="/players"      element={<PlayersPage />} />
                      <Route path="/teams"        element={<TeamsPage />} />
                      <Route path="/sold"         element={<SoldPlayersPage />} />
                      <Route path="/unsold"       element={<UnsoldPlayersPage />} />
                      <Route path="/registration" element={<RegistrationSettingsPage />} />
                      <Route path="/registrations" element={<RegisteredPlayersPage />} />
                    </Routes>
                  </main>
                </>
              } />
            </Routes>
            <Toaster position="top-right" toastOptions={toastOpts} />
          </div>
        </BrowserRouter>
      </TournamentProvider>
    </ThemeProvider>
  );
}
