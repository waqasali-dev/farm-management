import { CONSTANTS } from '../config/constants.js';

/**
 * Egg Unit System & Calculations (Sections 12, 13, 14)
 * 1 tray = 30 eggs
 * 1 peti = 12 trays = 360 eggs
 */

export function petiTraysToEggs(peti: number, trays: number): number {
  if (peti < 0 || trays < 0) {
    throw new Error('Peti and trays cannot be negative');
  }
  return peti * CONSTANTS.EGGS.EGGS_PER_PETI + trays * CONSTANTS.EGGS.EGGS_PER_TRAY;
}

export function eggsToPetiTrays(eggs: number): {
  peti: number;
  trays: number;
  looseEggs: number;
  formatted: string;
} {
  if (eggs < 0) {
    throw new Error('Negative egg stock is not allowed');
  }
  const peti = Math.floor(eggs / CONSTANTS.EGGS.EGGS_PER_PETI);
  const remainderAfterPeti = eggs % CONSTANTS.EGGS.EGGS_PER_PETI;
  const trays = Math.floor(remainderAfterPeti / CONSTANTS.EGGS.EGGS_PER_TRAY);
  const looseEggs = remainderAfterPeti % CONSTANTS.EGGS.EGGS_PER_TRAY;

  const formatted = looseEggs > 0
    ? `${peti} Peti, ${trays} Trays, ${looseEggs} Eggs`
    : `${peti} Peti, ${trays} Trays`;

  return { peti, trays, looseEggs, formatted };
}

export function calculateProductionPercentage(productionEggs: number, remainingBirds: number): number {
  if (remainingBirds <= 0 || productionEggs <= 0) return 0;
  const pct = (productionEggs / remainingBirds) * 100;
  return Number(pct.toFixed(2));
}

export function calculateRemainingEggStock(
  previousStockEggs: number,
  todayProductionEggs: number,
  todaySoldEggs: number,
  todayUsageEggs: number
): number {
  const total = previousStockEggs + todayProductionEggs - todaySoldEggs - todayUsageEggs;
  if (total < 0) {
    throw new Error('Egg stock cannot drop below zero');
  }
  return total;
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
  const safePeti = Math.max(0, Math.floor(peti || 0));
  const safeTrays = Math.max(0, Math.floor(trays || 0));
  const totalTrays = safePeti * 12 + safeTrays;
  const normalizedPeti = Math.floor(totalTrays / 12);
  const normalizedTrays = totalTrays % 12; // always 0 to 11
  const totalEggs = totalTrays * CONSTANTS.EGGS.EGGS_PER_TRAY;
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
    const p = Math.max(0, Math.floor(item.peti || 0));
    const t = Math.max(0, Math.floor(item.trays || 0));
    totalTrays += p * 12 + t;
  }
  const peti = Math.floor(totalTrays / 12);
  const trays = totalTrays % 12;
  const totalEggs = totalTrays * CONSTANTS.EGGS.EGGS_PER_TRAY;
  const formatted = `${peti} Peti, ${trays} Trays`;

  return { peti, trays, totalTrays, totalEggs, formatted };
}
