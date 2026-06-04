export function playerIdLabel(player) {
  return player?.id != null ? `ID #${player.id}` : 'ID pending';
}

export function matchesPlayerIdOrName(player, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const id = String(player?.id || '').toLowerCase();
  const idWithPrefix = `#${id}`;
  const idLabel = `id ${id}`;
  const name = String(player?.name || '').toLowerCase();
  return id.includes(q) || idWithPrefix.includes(q) || idLabel.includes(q) || name.includes(q);
}
