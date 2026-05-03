import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useTournament } from '../../contexts/TournamentContext';
import { useAuth } from '../../contexts/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';
import TournamentSelector from './TournamentSelector';
import { resolveUrl } from '../../utils/resolveUrl';
import {
  Trophy, Users, Gavel, ShieldCheck, XCircle, Home,
  ClipboardList, Settings, UserCog, LogOut, Crown,
} from 'lucide-react';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

export default function Navbar() {
  const location = useLocation();
  const { isSuperAdmin, isOperator, user, logout, brand } = useAuth();

  const navLinks = [
    { to: '/',              label: 'Home',          icon: Home,          show: true },
    { to: '/players',       label: 'Players',        icon: Users,         show: true },
    { to: '/auction',       label: 'Live Auction',   icon: Gavel,         show: isOperator },
    { to: '/teams',         label: 'Teams',          icon: ShieldCheck,   show: true },
    { to: '/sold',          label: 'Sold',           icon: Trophy,        show: true },
    { to: '/unsold',        label: 'Unsold',         icon: XCircle,       show: true },
    { to: '/registrations', label: 'Registrations',  icon: ClipboardList, show: isOperator },
    { to: '/registration',  label: 'Form Builder',   icon: Settings,      show: isSuperAdmin },
    { to: '/users',         label: 'Users',          icon: UserCog,       show: isSuperAdmin },
  ].filter(l => l.show);

  const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin'
                  : user?.role === 'OPERATOR'    ? 'Operator'
                  : 'Viewer';
  const roleColor = user?.role === 'SUPER_ADMIN' ? 'var(--color-warning)'
                  : user?.role === 'OPERATOR'    ? 'var(--color-primary)'
                  : 'var(--color-success)';

  // Resolve logo URL
  const logoSrc = brand.logoUrl
    ? (brand.logoUrl.startsWith('/api') ? API_ORIGIN + brand.logoUrl : brand.logoUrl)
    : null;

  return (
    <nav
      className="sticky top-0 z-50 px-4 py-2.5 flex items-center gap-2 flex-wrap shadow-lg"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* ── Brand Logo + Name ── */}
      <Link to="/" className="flex items-center gap-2 mr-3 flex-shrink-0">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={brand.name}
            className="h-8 w-auto rounded-lg object-contain"
            style={{ maxWidth: 120 }}
            onError={e => e.target.style.display = 'none'}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            CA
          </div>
        )}
        <span
          className="font-bold hidden sm:inline truncate"
          style={{ color: 'var(--color-text-primary)', maxWidth: 160 }}
          title={brand.name}
        >
          {brand.name}
        </span>
      </Link>

      {/* ── Navigation links ── */}
      <div className="flex items-center gap-0.5 flex-wrap">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              <Icon size={13} />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* ── User badge ── */}
      <div
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs flex-shrink-0"
        style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        {user?.role === 'SUPER_ADMIN' && <Crown size={12} style={{ color: roleColor }} />}
        <span style={{ color: 'var(--color-text-secondary)' }}>{user?.displayName}</span>
        <span className="font-bold" style={{ color: roleColor }}>· {roleLabel}</span>
      </div>

      <TournamentSelector />
      <ThemeSwitcher />

      <button onClick={logout} className="btn-secondary !p-2" title="Sign out">
        <LogOut size={14} />
      </button>
    </nav>
  );
}
