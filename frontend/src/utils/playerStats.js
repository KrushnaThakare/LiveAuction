export function hasPlayerStats(player) {
  if (!player) return false;
  return [
    player.statsMatches,
    player.statsRuns,
    player.statsStrikeRate,
    player.statsWickets,
    player.statsEconomy,
    player.statsAverage,
  ].some(value => value !== null && value !== undefined && value !== '');
}

export function statValue(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(2);
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return Number.isInteger(numeric) ? numeric.toLocaleString('en-IN') : numeric.toFixed(2);
  }
  return value;
}
