/** Mobile resolution helpers for sold-player WhatsApp display */

function parseFormData(reg) {
  if (!reg?.formData) return {};
  try {
    const parsed = JSON.parse(reg.formData);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function parsePlayerExtraData(player) {
  const raw = player?.extraData;
  if (!raw || typeof raw !== 'object') return {};
  return raw;
}

function isMobileLabel(label) {
  return /mobile|phone|whatsapp/i.test(label || '');
}

function normalizeCell(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function buildRegistrationIndex(registrations = []) {
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

export function findRegistrationForPlayer(player, index) {
  if (!player || !index) return null;
  if (player.id != null && index.byPlayerId.has(Number(player.id))) {
    return index.byPlayerId.get(Number(player.id));
  }
  const nameKey = String(player.name || '').trim().toLowerCase();
  return nameKey ? index.byName.get(nameKey) || null : null;
}

export function resolvePlayerMobile(player, registrationIndex) {
  const reg = findRegistrationForPlayer(player, registrationIndex);
  const formData = parseFormData(reg);
  const playerExtra = parsePlayerExtraData(player);

  if (reg?.mobile) return normalizeCell(reg.mobile);

  for (const [label, value] of Object.entries(playerExtra)) {
    if (isMobileLabel(label) && value) return normalizeCell(value);
  }

  const fromForm = normalizeCell(formData.mobile || formData.phone || formData.whatsapp);
  if (fromForm) return fromForm;

  for (const [key, value] of Object.entries(formData)) {
    if (isMobileLabel(key) && value) return normalizeCell(value);
  }

  return '';
}

export function maskMobile(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '—';
  return `******${digits.slice(-4)}`;
}
