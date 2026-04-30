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

export function formatRole(role) {
  const roleMap = {
    BATSMAN: 'Batsman',
    BOWLER: 'Bowler',
    ALL_ROUNDER: 'All-Rounder',
    WICKET_KEEPER: 'Wicket Keeper',
  };
  return roleMap[role] || role;
}

export function getRoleColor(role) {
  const colors = {
    BATSMAN: '#3b82f6',
    BOWLER: '#ef4444',
    ALL_ROUNDER: '#10b981',
    WICKET_KEEPER: '#f59e0b',
  };
  return colors[role] || '#64748b';
}

export function getRoleBg(role) {
  const colors = {
    BATSMAN: 'rgba(59,130,246,0.15)',
    BOWLER: 'rgba(239,68,68,0.15)',
    ALL_ROUNDER: 'rgba(16,185,129,0.15)',
    WICKET_KEEPER: 'rgba(245,158,11,0.15)',
  };
  return colors[role] || 'rgba(100,116,139,0.15)';
}
