import { CONSTANTS } from '../config/constants.js';

/**
 * Feed Calculations (Section 11)
 * 1 bag = 50 kg = 50,000 grams
 */

export function bagsToKg(bags: number): number {
  return bags * CONSTANTS.FEED.BAG_WEIGHT_KG;
}

export function kgToBags(kg: number): number {
  return kg / CONSTANTS.FEED.BAG_WEIGHT_KG;
}

export function calculateRemainingFeedKg(totalArrivalKg: number, totalUsedKg: number): number {
  const remaining = totalArrivalKg - totalUsedKg;
  if (remaining < 0) {
    throw new Error('Negative feed stock is not allowed');
  }
  return remaining;
}

export function calculateRemainingFeedBags(
  totalArrivalBags: number,
  totalUsedBags: number,
  totalReturnedBags: number = 0
): number {
  const remaining = totalArrivalBags - totalUsedBags - totalReturnedBags;
  if (remaining < 0) {
    throw new Error('Negative feed inventory is not allowed');
  }
  return remaining;
}

export function calculateFeedConsumptionGramsPerBird(usedBagsToday: number, remainingBirds: number): number {
  if (remainingBirds <= 0 || usedBagsToday <= 0) return 0;
  const totalGrams = usedBagsToday * CONSTANTS.FEED.BAG_WEIGHT_GRAMS;
  const gPerBird = totalGrams / remainingBirds;
  return Number(gPerBird.toFixed(2));
}
