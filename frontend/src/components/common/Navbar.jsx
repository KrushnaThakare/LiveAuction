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

  const roleColor = user?.role === 'SUPER_ADMIN' ? 'var(--color-warning)'
                  : user?.role === 'OPERATOR'    ? 'var(--color-primary)'
                  : 'var(--color-success)';

  const logoSrc = brand.logoUrl
    ? (brand.logoUrl.startsWith('/api') ? API_ORIGIN + brand.logoUrl : brand.logoUrl)
    : null;

  return (
    <nav className="sticky top-0 z-50"
      style={{
        background: 'var(--color-surface)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.3)',
      }}>

      {/* Thin gradient accent line at very top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 2,
        background: 'var(--gradient-primary)',
        opacity: 0.8,
      }} />

      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 mr-3 flex-shrink-0">
          {logoSrc ? (
            <img src={logoSrc} alt={brand.name}
              className="h-8 w-auto rounded-lg object-contain"
              style={{ maxWidth: 120 }}
              onError={e => e.target.style.display = 'none'} />
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0"
              style={{
                background: 'var(--gradient-primary)',
                boxShadow: '0 0 14px var(--color-primary-glow)',
                color: 'white',
              }}>
              CA
            </div>
          )}
          <span className="font-black text-sm hidden sm:inline truncate"
            style={{ color: 'var(--color-text-primary)', maxWidth: 160, letterSpacing: '-0.02em' }}>
            {brand.name}
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link key={to} to={to}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 relative"
                style={{
                  background: isActive
                    ? 'var(--gradient-primary)'
                    : 'transparent',
                  color: isActive ? 'white' : 'var(--color-text-secondary)',
                  boxShadow: isActive ? '0 2px 8px var(--color-primary-glow)' : 'none',
                }}>
                <Icon size={13} />
                <span className="hidden md:inline">{label}</span>
                {isActive && (
                  <span className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* User badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs flex-shrink-0"
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--color-border)',
            backdropFilter: 'blur(8px)',
          }}>
          {user?.role === 'SUPER_ADMIN' && <Crown size={11} style={{ color: roleColor }} />}
          <span style={{ color: 'var(--color-text-secondary)' }}>{user?.displayName}</span>
          <span className="font-bold text-xs px-1.5 py-0.5 rounded-md"
            style={{
              background: `${roleColor}22`,
              color: roleColor,
              border: `1px solid ${roleColor}44`,
            }}>
            {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'OPERATOR' ? 'Operator' : 'Viewer'}
          </span>
        </div>

        <TournamentSelector />
        <ThemeSwitcher />

        <button onClick={logout}
          className="btn-secondary !p-2 !rounded-xl"
          title="Sign out"
          style={{ minWidth: 36, minHeight: 36 }}>
          <LogOut size={14} />
        </button>
      </div>
    </nav>
  );
}
