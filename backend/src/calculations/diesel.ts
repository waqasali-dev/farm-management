/**
 * Diesel Calculations (Section 15)
 * Canonical unit: Liters
 */

export function calculateRemainingDieselLiters(totalArrivalLiters: number, totalUsedLiters: number): number {
  if (totalArrivalLiters < 0 || totalUsedLiters < 0) {
    throw new Error('Diesel volumes cannot be negative');
  }
  const remaining = totalArrivalLiters - totalUsedLiters;
  if (remaining < 0) {
    throw new Error('Diesel stock cannot drop below zero');
  }
  return Number(remaining.toFixed(2));
}
