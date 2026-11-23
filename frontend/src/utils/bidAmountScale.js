/** Count significant digits in the numeric bid (ignores formatting). */
export function bidAmountDigitLength(amount) {
  const n = Math.abs(Math.floor(Number(amount) || 0));
  if (n === 0) return 1;
  return String(n).length;
}

/**
 * Step down only the bid figure as amount gains digits (4→5→6…).
 * Rest of the audience UI stays at 100%.
 */
export function bidDigitTierScale(amount) {
  const digits = bidAmountDigitLength(amount);
  if (digits <= 4) return 1;
  if (digits === 5) return 0.96;
  if (digits === 6) return 0.92;
  if (digits === 7) return 0.87;
  if (digits === 8) return 0.82;
  return 0.78;
}