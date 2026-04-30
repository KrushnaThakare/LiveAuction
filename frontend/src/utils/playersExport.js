import { formatCurrency, formatRole } from './formatters';

const ROLE_COLORS = {
  BATSMAN:       '#3b82f6',
  BOWLER:        '#ef4444',
  ALL_ROUNDER:   '#10b981',
  WICKET_KEEPER: '#f59e0b',
};
const ROLE_BG = {
  BATSMAN:       'rgba(59,130,246,0.15)',
  BOWLER:        'rgba(239,68,68,0.15)',
  ALL_ROUNDER:   'rgba(16,185,129,0.15)',
  WICKET_KEEPER: 'rgba(245,158,11,0.15)',
};

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// inline same formula so the printed HTML works without a module import
function driveImgUrl(url) {
  if (!url) return null;
  try {
    if (!url.includes('drive.google.com')) return url;
    let id = '';
    if (url.includes('/d/')) { id = url.split('/d/')[1].split('/')[0]; }
    else if (url.includes('id=')) { id = url.split('id=')[1]; if (id.includes('&')) id = id.split('&')[0]; }
    if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
  } catch(_) {}
  return url;
}

export function exportPlayersList(players, tournamentName = '') {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f1f5f9; padding: 32px; }
    h1 { font-size: 2rem; font-weight: 900; margin-bottom: 4px; color: #3b82f6; }
    .subtitle { font-size: 0.85rem; color: #94a3b8; margin-bottom: 8px; }
    .meta { font-size: 0.75rem; color: #64748b; margin-bottom: 24px; }
    .stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
    .stat { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px; padding: 12px 20px; text-align: center; }
    .stat-val { font-size: 1.6rem; font-weight: 900; }
    .stat-lbl { font-size: 0.7rem; color: #94a3b8; margin-top: 2px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px; overflow: hidden; }
    .photo { width: 100%; aspect-ratio: 1; object-fit: cover; object-position: top;
             background: rgba(255,255,255,0.05); display: flex; align-items: center;
             justify-content: center; font-size: 3rem; font-weight: 900; }
    .photo img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .info { padding: 10px 12px; }
    .player-name { font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .role-badge { display: inline-block; font-size: 0.65rem; font-weight: 700;
                  padding: 2px 8px; border-radius: 999px; margin: 4px 0; }
    .base { font-size: 0.75rem; color: #94a3b8; }
    .base strong { color: #f59e0b; }
    .footer { margin-top: 40px; text-align: center; font-size: 0.7rem; color: #334155; }
    @media print {
      body { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

  const roleGroups = {};
  players.forEach(p => {
    if (!roleGroups[p.role]) roleGroups[p.role] = [];
    roleGroups[p.role].push(p);
  });

  const sections = Object.entries(roleGroups).map(([role, ps]) => {
    const rc  = ROLE_COLORS[role] || '#64748b';
    const rbg = ROLE_BG[role]    || 'rgba(100,116,139,0.15)';

    const cards = ps.map(p => {
      const img = driveImgUrl(p.imageUrl);
      const photoHtml = img
        ? `<div class="photo" style="background:${rbg}"><img src="${img}" alt="${escHtml(p.name)}" referrerpolicy="no-referrer" loading="lazy"/></div>`
        : `<div class="photo" style="background:${rbg};color:${rc};">${escHtml(p.name[0])}</div>`;
      return `
        <div class="card" style="border-color:${rc}33;">
          ${photoHtml}
          <div class="info">
            <div class="player-name">${escHtml(p.name)}</div>
            <span class="role-badge" style="background:${rbg};color:${rc};">${formatRole(p.role)}</span>
            <div class="base">Base: <strong>${formatCurrency(p.basePrice)}</strong></div>
          </div>
        </div>`;
    }).join('');

    return `
      <h2 style="font-size:1rem;font-weight:800;margin:28px 0 12px;color:${rc};text-transform:uppercase;letter-spacing:.08em;">
        ${formatRole(role)} <span style="opacity:.5;font-weight:400;">(${ps.length})</span>
      </h2>
      <div class="grid">${cards}</div>`;
  }).join('');

  const total     = players.length;
  const available = players.filter(p => p.status === 'AVAILABLE').length;
  const sold      = players.filter(p => p.status === 'SOLD').length;
  const unsold    = players.filter(p => p.status === 'UNSOLD').length;

  const html = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Players — ${escHtml(tournamentName)}</title>
    <style>${css}</style>
  </head><body>
    <h1>${escHtml(tournamentName)}</h1>
    <div class="subtitle">Complete Player List</div>
    <div class="meta">Generated on ${new Date().toLocaleString()}</div>
    <div class="stats">
      <div class="stat"><div class="stat-val" style="color:#3b82f6">${total}</div><div class="stat-lbl">Total Players</div></div>
      <div class="stat"><div class="stat-val" style="color:#94a3b8">${available}</div><div class="stat-lbl">Available</div></div>
      <div class="stat"><div class="stat-val" style="color:#10b981">${sold}</div><div class="stat-lbl">Sold</div></div>
      <div class="stat"><div class="stat-val" style="color:#ef4444">${unsold}</div><div class="stat-lbl">Unsold</div></div>
    </div>
    ${sections}
    <div class="footer">Cricket Auction · ${escHtml(tournamentName)} · ${total} players</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}
