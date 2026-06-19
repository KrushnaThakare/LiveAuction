import { formatCurrency } from './formatters';

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

/** Build lookup maps for registration → player matching */
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

/** Normalize to wa.me digits (default India +91) */
export function normalizeWhatsAppPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

export function maskMobile(raw) {
  const phone = normalizeWhatsAppPhone(raw);
  if (!phone) return '—';
  return `******${phone.slice(-4)}`;
}

export function buildSoldCongratulationsMessage({
  playerName,
  teamName,
  tournamentName,
  soldAmount,
}) {
  const amount = typeof soldAmount === 'number' || soldAmount
    ? formatCurrency(soldAmount)
    : soldAmount;

  return [
    `Congratulations ${playerName || 'Player'}!`,
    '',
    `You have been selected by ${teamName || 'your team'} in ${tournamentName || 'the tournament'}.`,
    `Sold amount: ${amount}.`,
    '',
    'See you at the tournament!',
  ].join('\n');
}

export function buildWhatsAppUrl(mobile, message) {
  const phone = normalizeWhatsAppPhone(mobile);
  if (!phone || !message) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(mobile, message) {
  const url = buildWhatsAppUrl(mobile, message);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

const SENT_KEY = (tournamentId) => `sold-whatsapp-sent:${tournamentId}`;

export function loadWhatsAppSentIds(tournamentId) {
  if (!tournamentId) return new Set();
  try {
    const raw = localStorage.getItem(SENT_KEY(tournamentId));
    const ids = JSON.parse(raw || '[]');
    return new Set(ids.map(Number));
  } catch {
    return new Set();
  }
}

export function saveWhatsAppSentIds(tournamentId, sentIds) {
  if (!tournamentId) return;
  localStorage.setItem(SENT_KEY(tournamentId), JSON.stringify([...sentIds]));
}

export function markPlayerWhatsAppSent(tournamentId, playerId, sentIds) {
  const next = new Set(sentIds);
  next.add(Number(playerId));
  saveWhatsAppSentIds(tournamentId, next);
  return next;
}

export function clearWhatsAppSentIds(tournamentId) {
  if (!tournamentId) return new Set();
  localStorage.removeItem(SENT_KEY(tournamentId));
  return new Set();
}

export function buildSoldPlayerContact(player, registrationIndex, tournament) {
  const mobile = resolvePlayerMobile(player, registrationIndex);
  const tournamentName = tournament?.auctionDisplayName || tournament?.name || 'Tournament';
  const message = buildSoldCongratulationsMessage({
    playerName: player?.name,
    teamName: player?.teamName,
    tournamentName,
    soldAmount: player?.currentBid,
  });
  return {
    playerId: player?.id,
    playerName: player?.name,
    teamName: player?.teamName,
    mobile,
    phone: normalizeWhatsAppPhone(mobile),
    message,
    url: buildWhatsAppUrl(mobile, message),
  };
}
