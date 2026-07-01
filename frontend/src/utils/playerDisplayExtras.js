function normalizeHeader(label) {
  return String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parsePlayerExtraEntries(player) {
  const raw = player?.extraData;
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([label, value]) => ({
      label: String(label).trim(),
      value: String(value).trim(),
      key: normalizeHeader(label),
    }));
}

/**
 * Maps optional Excel extra columns onto overlay detail slots.
 * Known header names match first; remaining extras fill empty slots in column order.
 * Slots without data keep their existing fallback label/value.
 */
export function resolvePlayerDetailSlots(player, slotDefs) {
  const entries = parsePlayerExtraEntries(player);
  const used = new Set();

  return slotDefs.map((slot) => {
    const aliases = new Set([
      normalizeHeader(slot.key),
      ...(slot.headerAliases || []).map(normalizeHeader),
    ]);
    const matched = entries.find((entry) => !used.has(entry.key) && aliases.has(entry.key));
    if (matched) {
      used.add(matched.key);
      return { label: matched.label, value: matched.value };
    }
    const next = entries.find((entry) => !used.has(entry.key));
    if (next) {
      used.add(next.key);
      return { label: next.label, value: next.value };
    }
    return {
      label: slot.defaultLabel,
      value: slot.fallback(player),
    };
  });
}

export const AUDIENCE_DETAIL_SLOTS = [
  {
    key: 'category',
    defaultLabel: 'Category',
    headerAliases: ['category', 'pool', 'playertype', 'type', 'division'],
    fallback: (player) => player?.category || player?.teamName || 'Open Pool',
  },
  {
    key: 'age',
    defaultLabel: 'Age',
    headerAliases: ['age', 'playerage'],
    fallback: (player) => player?.age || 'Auction Pool',
  },
];

export const MAIN_OVERLAY_STAT_SLOTS = [
  {
    key: 'age',
    defaultLabel: 'Age',
    headerAliases: ['age', 'playerage'],
    fallback: (player) => player?.age || 'Auction Pool',
  },
  {
    key: 'history',
    defaultLabel: 'History',
    headerAliases: ['history', 'previousteam', 'club', 'teamhistory', 'pastteam', 'experience'],
    fallback: (player) => player?.teamName || player?.stats || 'Fresh pick',
  },
];
