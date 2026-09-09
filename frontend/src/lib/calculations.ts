export const EGGS_PER_PETI = 360;
export const EGGS_PER_TRAY = 30;
export const FEED_BAG_WEIGHT_KG = 50;

export function petiTraysToEggs(peti: number, trays: number): number {
  return (Number(peti) || 0) * EGGS_PER_PETI + (Number(trays) || 0) * EGGS_PER_TRAY;
}

export function eggsToPetiTrays(eggs: number): {
  peti: number;
  trays: number;
  looseEggs: number;
  formatted: string;
} {
  const safeEggs = Math.max(0, Number(eggs) || 0);
  const peti = Math.floor(safeEggs / EGGS_PER_PETI);
  const remainder = safeEggs % EGGS_PER_PETI;
  const trays = Math.floor(remainder / EGGS_PER_TRAY);
  const looseEggs = remainder % EGGS_PER_TRAY;

  const formatted = looseEggs > 0
    ? `${peti} Peti, ${trays} Trays, ${looseEggs} Eggs`
    : `${peti} Peti, ${trays} Trays`;

  return { peti, trays, looseEggs, formatted };
}

export function calculateProductionPercentage(productionEggs: number, remainingBirds: number): number {
  if (remainingBirds <= 0 || productionEggs <= 0) return 0;
  return Number(((productionEggs / remainingBirds) * 100).toFixed(2));
}

export function calculateFeedPerBirdGrams(usedBags: number, remainingBirds: number): number {
  if (remainingBirds <= 0 || usedBags <= 0) return 0;
  return Number(((usedBags * 50000) / remainingBirds).toFixed(2));
}

export function calculateWaterPerBirdMl(waterLiters: number, remainingBirds: number): number {
  if (remainingBirds <= 0 || waterLiters <= 0) return 0;
  return Number(((waterLiters * 1000) / remainingBirds).toFixed(2));
}

export function calculateRemainingBirds(initialBirds: number, cumulativeMortality: number): number {
  const safeInitial = Math.max(0, Number(initialBirds) || 0);
  const safeMortality = Math.max(0, Number(cumulativeMortality) || 0);
  return Math.max(0, safeInitial - safeMortality);
}

export function calculateBirdAge(targetDateStr: string, startDateStr: string): {
  week: number;
  day: number;
  totalDays: number;
  formatted: string;
} {
  const target = new Date(targetDateStr);
  const start = new Date(startDateStr);
  const diffTime = target.getTime() - start.getTime();
  const totalDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  const day = target.getDay(); // 0 = Sunday (Day 00)
  const week = Math.floor(totalDays / 7) + 1; // 1-indexed: Day 0-6 = Week 1, Day 14-20 = Week 3
  const formattedWeek = week < 10 ? `0${week}` : `${week}`;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  return {
    week,
    day,
    totalDays,
    formatted: `W${formattedWeek}-D${formattedDay}`,
  };
}

export function calculateStartDateFromAge(
  referenceDateStr: string,
  week: number,
  day: number
): {
  startDate: string;
  elapsedDays: number;
} {
  const ref = new Date(referenceDateStr + 'T00:00:00');
  const safeWeek = Math.max(1, Math.floor(Number(week) || 1));
  const safeDay = Math.max(0, Math.min(6, Math.floor(Number(day) || 0)));
  const elapsedDays = (safeWeek - 1) * 7 + safeDay;

  const start = new Date(ref);
  start.setDate(start.getDate() - elapsedDays);

  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');

  return {
    startDate: `${y}-${m}-${d}`,
    elapsedDays,
  };
}

export function calculateRemainingFeedBags(
  totalArrivalBags: number,
  totalUsedBags: number,
  totalReturnedBags: number = 0
): number {
  return Math.max(0, Number(totalArrivalBags || 0) - Number(totalUsedBags || 0) - Number(totalReturnedBags || 0));
}
