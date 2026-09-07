/**
 * Water Intake Calculations (Section 18)
 * Canonical unit: Liters
 * Display metric: ml per bird
 */

export function calculateWaterPerBirdMl(waterLiters: number, remainingBirds: number): number {
  if (remainingBirds <= 0 || waterLiters <= 0) return 0;
  const totalMl = waterLiters * 1000;
  const mlPerBird = totalMl / remainingBirds;
  return Number(mlPerBird.toFixed(2));
}
