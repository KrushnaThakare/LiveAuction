import { formatCurrency, formatRole } from './formatters';

const API_ORIGIN = (() => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:8080/api';
  return base.replace(/\/api\/?$/, '').replace(/\/+$/, '');
})();

function driveImgUrl(url) {
  if (!url) return null;
  if (url.startsWith('/api/')) return API_ORIGIN + url; // local upload — make absolute
  if (url.startsWith('http')) return url;               // already absolute
  return null;
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
        ? `<img src="${pImg}" alt="${p.name}" />`
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

function escCsv(value = '') {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseFormData(reg) {
  if (!reg?.formData) return {};
  try {
    const parsed = JSON.parse(reg.formData);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeExportCell(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(normalizeExportCell).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const url = value.url || value.secure_url || value.fileUrl;
    if (url) return normalizeExportCell(url);
    return '';
  }
  return String(value).trim();
}

function buildRegistrationIndex(registrations = []) {
  const byPlayerId = new Map();
  const byName = new Map();
  for (const reg of registrations) {
    if (reg.importedPlayerId != null) {
      byPlayerId.set(Number(reg.importedPlayerId), reg);
    }
    const nameKey = String(reg.playerName || '').trim().toLowerCase();
    if (nameKey) byName.set(nameKey, reg);
  }
  return { byPlayerId, byName };
}

function findRegistrationForPlayer(player, index) {
  if (!player) return null;
  if (player.id != null && index.byPlayerId.has(Number(player.id))) {
    return index.byPlayerId.get(Number(player.id));
  }
  const nameKey = String(player.name || '').trim().toLowerCase();
  return nameKey ? index.byName.get(nameKey) || null : null;
}

const SKIP_FIELD_TYPES = new Set(['FILE_UPLOAD', 'STATIC_IMAGE']);
const SKIP_PLAYER_MAPS = new Set(['name', 'role', 'basePrice']);

function collectDetailColumns(formSections = []) {
  const columns = [];
  const seen = new Set();
  const fields = (formSections || [])
    .flatMap(section => section.fields || [])
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));

  for (const field of fields) {
    if (!field?.fieldKey || seen.has(field.fieldKey)) continue;
    if (SKIP_FIELD_TYPES.has(field.type)) continue;
    if (SKIP_PLAYER_MAPS.has(field.mapsToPlayerField)) continue;
    if (field.type === 'PHONE' || field.fieldKey === 'mobile' || field.fieldKey === 'phone') continue;
    if (/mobile|phone/i.test(field.label || '')) continue;
    seen.add(field.fieldKey);
    columns.push({
      key: field.fieldKey,
      label: field.label || field.fieldKey,
      lookupKeys: [field.fieldKey, field.label].filter(Boolean),
    });
  }
  return columns;
}

function parsePlayerExtraData(player) {
  const raw = player?.extraData;
  if (!raw || typeof raw !== 'object') return {};
  return raw;
}

function normalizeColKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isMobileLabel(label) {
  return /mobile|phone/i.test(label || '');
}

function collectAllExportColumns(formSections, teams) {
  const formCols = collectDetailColumns(formSections);
  const ordered = [...formCols];
  const seenNorm = new Set(formCols.map(col => normalizeColKey(col.label)));

  for (const team of teams || []) {
    for (const player of team.players || []) {
      for (const [label, value] of Object.entries(parsePlayerExtraData(player))) {
        if (!value || isMobileLabel(label)) continue;
        const norm = normalizeColKey(label);
        if (!norm || seenNorm.has(norm)) continue;
        seenNorm.add(norm);
        ordered.push({ key: label, label, lookupKeys: [label] });
      }
    }
  }
  return ordered;
}

function getColumnValue(formData, playerExtra, col) {
  const keys = col.lookupKeys || [col.key, col.label];
  for (const key of keys) {
    if (formData?.[key] != null && formData[key] !== '') {
      return normalizeExportCell(formData[key]);
    }
    if (playerExtra?.[key] != null && playerExtra[key] !== '') {
      return normalizeExportCell(playerExtra[key]);
    }
  }
  for (const [label, value] of Object.entries(playerExtra || {})) {
    if (normalizeColKey(label) === normalizeColKey(col.label)) {
      return normalizeExportCell(value);
    }
  }
  return '';
}

function resolveMobile(reg, formData, playerExtra) {
  if (reg?.mobile) return reg.mobile;
  for (const [label, value] of Object.entries(playerExtra || {})) {
    if (isMobileLabel(label) && value) return normalizeExportCell(value);
  }
  return normalizeExportCell(formData.mobile || formData.phone || '');
}

function buildPlayerDetailRow(player, index, extraColumns) {
  const reg = findRegistrationForPlayer(player, index);
  const formData = parseFormData(reg);
  const playerExtra = parsePlayerExtraData(player);
  return {
    name: player?.name || '',
    role: formatRole(player?.role),
    mobile: resolveMobile(reg, formData, playerExtra),
    soldPrice: formatCurrency(player?.currentBid || 0),
    extras: extraColumns.map(col => getColumnValue(formData, playerExtra, col)),
  };
}

const BASE_DETAIL_HEADERS = ['#', 'Name', 'Role', 'Mobile', 'Sold Price'];

/**
 * Opens a printable team-wise squad details table (PDF via print) and downloads CSV.
 * Uses registration data fetched once at export time — no ongoing backend load.
 */
export function exportTeamSquadDetails(teams, tournamentName = '', registrations = [], formSections = []) {
  const extraColumns = collectAllExportColumns(formSections, teams);
  const headers = [...BASE_DETAIL_HEADERS, ...extraColumns.map(col => col.label)];
  const index = buildRegistrationIndex(registrations);
  const generatedOn = new Date().toLocaleString();

  const teamBlocks = teams.map((team) => {
    const players = team.players || [];
    const rows = players.map((player, idx) => {
      const detail = buildPlayerDetailRow(player, index, extraColumns);
      return [idx + 1, detail.name, detail.role, detail.mobile, detail.soldPrice, ...detail.extras];
    });
    return { team, headers, rows };
  });

  downloadSquadDetailsCsv(teamBlocks, tournamentName, generatedOn);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    .page { width: 100%; min-height: 100vh; padding: 28px 32px 40px; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .header { margin-bottom: 18px; border-bottom: 3px solid #0f766e; padding-bottom: 14px; }
    .team-name { font-size: 1.85rem; font-weight: 900; color: #0f766e; }
    .meta { margin-top: 6px; font-size: 0.85rem; color: #475569; }
    .note { margin: 0 0 16px; font-size: 0.78rem; color: #64748b; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; background: white; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #ecfeff; color: #0f172a; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; }
    tr:nth-child(even) td { background: #f8fafc; }
    .empty { text-align: center; color: #94a3b8; padding: 28px; border: 1px dashed #cbd5e1; border-radius: 12px; }
    .footer { margin-top: 22px; font-size: 0.72rem; color: #94a3b8; text-align: right; }
    .toolbar { position: sticky; top: 0; background: #0f172a; color: white; padding: 12px 20px;
               display: flex; gap: 12px; align-items: center; justify-content: space-between; }
    .toolbar button { background: #0f766e; color: white; border: none; border-radius: 8px;
                      padding: 8px 14px; font-weight: 700; cursor: pointer; }
    @media print {
      .toolbar { display: none; }
      body { background: white; }
      .page { padding: 18px 0 0; }
    }
  `;

  const pages = teamBlocks.map(({ team, headers: teamHeaders, rows }) => {
    const head = teamHeaders.map(h => `<th>${escHtml(h)}</th>`).join('');
    const body = rows.length
      ? rows.map(cells => `<tr>${cells.map(cell => `<td>${escHtml(cell)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${teamHeaders.length}" class="empty">No players in this squad yet</td></tr>`;

    return `
      <section class="page">
        <div class="header">
          <div class="team-name">${escHtml(team.name)}</div>
          <div class="meta">${escHtml(tournamentName)} · Squad details · ${team.playerCount || rows.length} players</div>
        </div>
        <p class="note">Registration details for team formation. Photos are omitted intentionally.</p>
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
        <div class="footer">Generated ${escHtml(generatedOn)}</div>
      </section>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Squad Details — ${escHtml(tournamentName)}</title>
    <style>${css}</style></head><body>
    <div class="toolbar">
      <span>Squad details export · CSV already downloaded</span>
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>
    ${pages}
    </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => win.focus();
}

function downloadSquadDetailsCsv(teamBlocks, tournamentName, generatedOn) {
  const lines = [`Tournament,${escCsv(tournamentName)}`, `Generated,${escCsv(generatedOn)}`, ''];

  for (const { team, headers, rows } of teamBlocks) {
    lines.push(`Team,${escCsv(team.name)}`);
    lines.push(headers.map(escCsv).join(','));
    for (const row of rows) {
      lines.push(row.map(escCsv).join(','));
    }
    lines.push('');
  }

  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = String(tournamentName || 'tournament').replace(/[^\w\-]+/g, '-').toLowerCase();
  anchor.href = url;
  anchor.download = `squad-details-${safeName || 'export'}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
