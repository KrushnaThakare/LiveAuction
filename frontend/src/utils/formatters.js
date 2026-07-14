export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0';
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** e.g. 1 → "1st", 10 → "10th", 11 → "11th" */
export function formatOrdinal(value) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return null;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** e.g. 10 → "10th Player" — uses team.playerCount already in overlay snapshots */
export function formatSquadPickLabel(playerCount) {
  const ordinal = formatOrdinal(playerCount);
  return ordinal ? `${ordinal} Player` : null;
}

export function getAuctionDisplayName(tournament, fallback = 'Auction') {
  return tournament?.auctionDisplayName || tournament?.name || tournament?.tournamentName || fallback;
}

export const DEFAULT_PLAYER_ROLES = [
  { key: 'BATSMAN', label: 'Batsman', shortLabel: 'BAT', color: '#3b82f6', icon: '🏏' },
  { key: 'BOWLER', label: 'Bowler', shortLabel: 'BOWL', color: '#ef4444', icon: '🎳' },
  { key: 'ALL_ROUNDER', label: 'All-Rounder', shortLabel: 'AR', color: '#10b981', icon: '⭐' },
  { key: 'WICKET_KEEPER', label: 'Wicket Keeper', shortLabel: 'WK', color: '#f59e0b', icon: '🧤' },
];

export const FOOTBALL_PLAYER_ROLES = [
  { key: 'FORWARD', label: 'Forward', shortLabel: 'FWD', color: '#3b82f6', icon: 'FWD' },
  { key: 'MIDFIELDER', label: 'Midfielder', shortLabel: 'MID', color: '#10b981', icon: 'MID' },
  { key: 'DEFENDER', label: 'Defender', shortLabel: 'DEF', color: '#ef4444', icon: 'DEF' },
  { key: 'GOALKEEPER', label: 'Goalkeeper', shortLabel: 'GK', color: '#f59e0b', icon: 'GK' },
];

export function roleLinesToConfig(text) {
  return String(text || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [key, label, shortLabel, color] = line.split('|').map(part => part?.trim());
      return {
        key,
        label: label || key,
        shortLabel: shortLabel || key,
        color: color || '#64748b',
        icon: shortLabel || key,
        aliases: [],
      };
    })
    .filter(role => role.key);
}

export function roleConfigToLines(roles) {
  return (roles || DEFAULT_PLAYER_ROLES)
    .map(role => [role.key, role.label, role.shortLabel, role.color].filter(Boolean).join('|'))
    .join('\n');
}

export function getPlayerRoles(tournament) {
  return Array.isArray(tournament?.playerRoles) && tournament.playerRoles.length
    ? tournament.playerRoles
    : DEFAULT_PLAYER_ROLES;
}

function findRole(role, roles) {
  return (roles || DEFAULT_PLAYER_ROLES).find(r => r.key === role);
}

function titleizeRole(role) {
  return String(role || 'Role')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatRole(role, roles) {
  return findRole(role, roles)?.label || titleizeRole(role);
}

export function getRoleShortLabel(role, roles) {
  return findRole(role, roles)?.shortLabel || titleizeRole(role).toUpperCase();
}

export function getRoleIcon(role, roles) {
  return findRole(role, roles)?.icon || '🏷️';
}

export function getRoleColor(role, roles) {
  return findRole(role, roles)?.color || '#64748b';
}

export function getRoleBg(role, roles) {
  const hex = getRoleColor(role, roles);
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return `rgba(${r},${g},${b},0.15)`;
  }
  return 'rgba(100,116,139,0.15)';
}
