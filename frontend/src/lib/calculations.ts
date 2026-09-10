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

/**
 * Normalizes Peti and Trays using the canonical 12 trays = 1 peti rule.
 * Converts all Petis into Trays: totalTrays = peti * 12 + trays
 * Then converts totalTrays into Petis and remaining Trays (0 to 11).
 * Trays can never exceed 11 because 12 trays constitute 1 Peti.
 */
export function normalizePetiTrays(peti: number, trays: number): {
  peti: number;
  trays: number;
  totalTrays: number;
  totalEggs: number;
  formatted: string;
} {
  const safePeti = Math.max(0, Math.floor(Number(peti) || 0));
  const safeTrays = Math.max(0, Math.floor(Number(trays) || 0));
  const totalTrays = safePeti * 12 + safeTrays;
  const normalizedPeti = Math.floor(totalTrays / 12);
  const normalizedTrays = totalTrays % 12; // always 0 to 11
  const totalEggs = totalTrays * EGGS_PER_TRAY;
  const formatted = `${normalizedPeti} Peti, ${normalizedTrays} Trays`;

  return {
    peti: normalizedPeti,
    trays: normalizedTrays,
    totalTrays,
    totalEggs,
    formatted,
  };
}

/**
 * Sums an array or series of Petis and Trays by first converting all to Trays,
 * summing the Trays, and then converting back into normalized Petis and Trays (0-11).
 */
export function sumPetiTrays(items: { peti: number; trays: number }[]): {
  peti: number;
  trays: number;
  totalTrays: number;
  totalEggs: number;
  formatted: string;
} {
  let totalTrays = 0;
  for (const item of items) {
    const p = Math.max(0, Math.floor(Number(item.peti) || 0));
    const t = Math.max(0, Math.floor(Number(item.trays) || 0));
    totalTrays += p * 12 + t;
  }
  const peti = Math.floor(totalTrays / 12);
  const trays = totalTrays % 12;
  const totalEggs = totalTrays * EGGS_PER_TRAY;
  const formatted = `${peti} Peti, ${trays} Trays`;

  return { peti, trays, totalTrays, totalEggs, formatted };
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
  const target = new Date(targetDateStr + (targetDateStr.includes('T') ? '' : 'T00:00:00'));
  const start = new Date(startDateStr + (startDateStr.includes('T') ? '' : 'T00:00:00'));
  const diffTime = target.getTime() - start.getTime();
  const totalDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  // Flock Age calculation:
  // Starts on placement date (targetDate === startDate) as Week 01, Day 01.
  // Day runs 1 through 7 within each week:
  // totalDays = 0 => week 1, day 1 (W01-D01)
  // totalDays = 6 => week 1, day 7 (W01-D07)
  // totalDays = 7 => week 2, day 1 (W02-D01)
  const week = Math.floor(totalDays / 7) + 1;
  const day = (totalDays % 7) + 1;
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
  const ref = new Date(referenceDateStr + (referenceDateStr.includes('T') ? '' : 'T00:00:00'));
  const safeWeek = Math.max(1, Math.floor(Number(week) || 1));
  const safeDay = Math.max(1, Math.min(7, Math.floor(Number(day) || 1)));
  const elapsedDays = (safeWeek - 1) * 7 + (safeDay - 1);

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
