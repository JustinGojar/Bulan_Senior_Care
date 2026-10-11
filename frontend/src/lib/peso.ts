/** Whole pesos with thousands separators, e.g. ₱5,000. */
export function formatPesoFull(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

// Large peso amounts are shortened so they fit cards: 100k and up, then 1M and up
// (thresholds sit just below each step so rounding never shows "100,000" or "1,000k").
export function formatPesoAmount(amount: number) {
  const short = (value: number, suffix: string) =>
    `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })}${suffix}`;
  if (Math.abs(amount) >= 999_995) return short(amount / 1_000_000, "M");
  if (Math.abs(amount) >= 99_999.5) return short(amount / 1_000, "k");
  return formatPesoFull(amount);
}
