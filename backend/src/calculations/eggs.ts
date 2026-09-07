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
