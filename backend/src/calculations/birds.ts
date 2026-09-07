/**
 * Bird & Mortality Calculations (Section 10)
 */

export function calculateRemainingBirds(initialBirds: number, cumulativeMortality: number): number {
  if (initialBirds < 0) throw new Error('Initial birds cannot be negative');
  if (cumulativeMortality < 0) throw new Error('Cumulative mortality cannot be negative');
  const remaining = initialBirds - cumulativeMortality;
  if (remaining < 0) {
    throw new Error('Cumulative mortality cannot exceed initial birds');
  }
  return remaining;
}

export function calculateMortalityPercentage(cumulativeMortality: number, initialBirds: number): number {
  if (initialBirds <= 0) return 0;
  if (cumulativeMortality < 0) return 0;
  const pct = (cumulativeMortality / initialBirds) * 100;
  return Number(pct.toFixed(2));
}
