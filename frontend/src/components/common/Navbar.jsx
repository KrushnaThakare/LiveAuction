import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useTournament } from '../../contexts/TournamentContext';
import ThemeSwitcher from './ThemeSwitcher';
import TournamentSelector from './TournamentSelector';
import {
  Trophy, Users, Gavel, ShieldCheck, XCircle, Home,
} from 'lucide-react';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/auction', label: 'Live Auction', icon: Gavel },
  { to: '/teams', label: 'Teams', icon: ShieldCheck },
  { to: '/sold', label: 'Sold', icon: Trophy },
  { to: '/unsold', label: 'Unsold', icon: XCircle },
];

export default function Navbar() {
  const location = useLocation();
  const { currentTheme } = useTheme();

  return (
    <nav
      className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 flex-wrap shadow-lg"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mr-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
        >
          CA
        </div>
        <span className="font-bold text-lg hidden sm:inline" style={{ color: 'var(--color-text-primary)' }}>
          Cricket Auction
        </span>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-1 flex-wrap">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <Icon size={15} />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Tournament Selector & Theme Switcher */}
      <div className="flex items-center gap-2">
        <TournamentSelector />
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
