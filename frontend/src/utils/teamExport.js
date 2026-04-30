import { formatCurrency, formatRole } from './formatters';

function driveImgUrl(url) {
  if (!url) return null;
  if (url.includes('lh3.googleusercontent.com')) return url;
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w400-h400`;
  }
  return url;
}

/**
 * Generates a full-page printable HTML roster for each team and opens the
 * browser's print dialog. Works without any PDF library.
 */
export function exportTeamRosters(teams, tournamentName = '') {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f1f5f9; }
    .page { width: 100%; min-height: 100vh; padding: 40px; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 32px;
              border-bottom: 3px solid; padding-bottom: 20px; }
    .logo { width: 80px; height: 80px; border-radius: 16px; display: flex;
            align-items: center; justify-content: center; font-size: 36px;
            font-weight: 900; color: white; overflow: hidden; flex-shrink: 0; }
    .logo img { width: 100%; height: 100%; object-fit: cover; }
    .team-name { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.03em; }
    .tournament-name { font-size: 0.9rem; opacity: 0.6; margin-top: 4px; }
    .budget-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 28px; }
    .budget-card { background: rgba(255,255,255,0.05); border-radius: 12px;
                   padding: 16px; border: 1px solid rgba(255,255,255,0.1); }
    .budget-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em;
                    opacity: 0.5; margin-bottom: 6px; }
    .budget-value { font-size: 1.6rem; font-weight: 900; }
    .players-title { font-size: 0.75rem; text-transform: uppercase;
                     letter-spacing: 0.12em; opacity: 0.5; margin-bottom: 12px; }
    .players-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .player-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px;
                  border-radius: 12px; background: rgba(255,255,255,0.04);
                  border: 1px solid rgba(255,255,255,0.08); }
    .player-avatar { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
                     display: flex; align-items: center; justify-content: center;
                     font-weight: 900; font-size: 1rem; overflow: hidden; }
    .player-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
    .player-name { font-weight: 700; font-size: 0.9rem; }
    .player-meta { font-size: 0.72rem; opacity: 0.55; margin-top: 2px; }
    .player-bid { font-weight: 800; font-size: 0.9rem; margin-left: auto; }
    .footer { margin-top: 40px; text-align: center; font-size: 0.7rem; opacity: 0.35; }
    .bar-wrap { height: 6px; background: rgba(255,255,255,0.08); border-radius: 999px;
                margin-top: 8px; overflow: hidden; }
    .bar { height: 100%; border-radius: 999px; }
    @media print {
      body { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  const ROLE_COLORS = {
    BATSMAN: '#3b82f6', BOWLER: '#ef4444',
    ALL_ROUNDER: '#10b981', WICKET_KEEPER: '#f59e0b',
  };
  const ROLE_BG = {
    BATSMAN: 'rgba(59,130,246,0.18)', BOWLER: 'rgba(239,68,68,0.18)',
    ALL_ROUNDER: 'rgba(16,185,129,0.18)', WICKET_KEEPER: 'rgba(245,158,11,0.18)',
  };

  const TEAM_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6',
  ];

  const pages = teams.map((team, teamIdx) => {
    const color = TEAM_COLORS[teamIdx % TEAM_COLORS.length];
    const spent = team.budget - team.remainingBudget;
    const pct   = team.budget ? Math.round((spent / team.budget) * 100) : 0;

    const logoHtml = team.logoUrl
      ? `<img src="${team.logoUrl}" alt="${team.name}" />`
      : team.name[0].toUpperCase();

    const playerRows = (team.players || []).map((p) => {
      const rc   = ROLE_COLORS[p.role] || '#64748b';
      const rbg  = ROLE_BG[p.role]    || 'rgba(100,116,139,0.18)';
      const pImg = driveImgUrl(p.imageUrl);
      const imgHtml = pImg
        ? `<img src="${pImg}" alt="${p.name}" referrerpolicy="no-referrer" />`
        : `<span>${p.name[0]}</span>`;

      return `
        <div class="player-row">
          <div class="player-avatar" style="background:${rbg};color:${rc};">${imgHtml}</div>
          <div>
            <div class="player-name">${escHtml(p.name)}</div>
            <div class="player-meta">${formatRole(p.role)}</div>
          </div>
          <div class="player-bid" style="color:${rc};">${formatCurrency(p.currentBid)}</div>
        </div>`;
    }).join('');

    return `
      <div class="page" style="background: linear-gradient(160deg, #0f172a 0%, #1e293b 100%);">
        <div class="header" style="border-color:${color};">
          <div class="logo" style="background:${color};">${logoHtml}</div>
          <div>
            <div class="team-name" style="color:${color};">${escHtml(team.name)}</div>
            <div class="tournament-name">${escHtml(tournamentName)} · ${team.playerCount} players</div>
          </div>
        </div>

        <div class="budget-row">
          <div class="budget-card">
            <div class="budget-label">Total Budget</div>
            <div class="budget-value" style="color:${color};">${formatCurrency(team.budget)}</div>
          </div>
          <div class="budget-card">
            <div class="budget-label">Spent</div>
            <div class="budget-value" style="color:#ef4444;">${formatCurrency(spent)}</div>
          </div>
          <div class="budget-card">
            <div class="budget-label">Remaining</div>
            <div class="budget-value" style="color:#10b981;">${formatCurrency(team.remainingBudget)}</div>
            <div class="bar-wrap">
              <div class="bar" style="width:${pct}%;background:${pct > 80 ? '#ef4444' : color};"></div>
            </div>
          </div>
        </div>

        <div class="players-title">Squad Roster</div>
        ${team.playerCount === 0
          ? '<p style="opacity:0.4;text-align:center;padding:40px;">No players acquired yet</p>'
          : `<div class="players-grid">${playerRows}</div>`}

        <div class="footer">Cricket Auction · ${tournamentName} · Generated ${new Date().toLocaleDateString()}</div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Team Rosters — ${escHtml(tournamentName)}</title>
    <style>${css}</style></head><body>${pages}</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
