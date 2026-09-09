import { differenceInCalendarDays, parseISO, subDays, format } from 'date-fns';

/**
 * Bird Age & Weight Week/Day Calculation (Section 16, 17)
 * Convention:
 * Sunday = Day 00
 * Monday = Day 01
 * Tuesday = Day 02
 * Wednesday = Day 03
 * Thursday = Day 04
 * Friday = Day 05
 * Saturday = Day 06
 */

export interface BirdAge {
  week: number;
  day: number;
  totalDays: number;
  formatted: string; // e.g., "W12-D03"
}

export function calculateBirdAge(
  targetDateInput: Date | string,
  flockStartDateInput: Date | string
): BirdAge {
  const targetDate = typeof targetDateInput === 'string' ? parseISO(targetDateInput) : targetDateInput;
  const startDate = typeof flockStartDateInput === 'string' ? parseISO(flockStartDateInput) : flockStartDateInput;

  const totalDays = differenceInCalendarDays(targetDate, startDate);
  const safeTotalDays = Math.max(0, totalDays);

  // Business day of week convention: Sunday = 0, Monday = 1, ..., Saturday = 6
  const day = targetDate.getDay();

  // Week number (1-indexed: Day 0-6 = Week 01, Day 7-13 = Week 02, Day 14-20 = Week 03)
  const week = Math.floor(safeTotalDays / 7) + 1;

  const formattedWeek = week < 10 ? `0${week}` : `${week}`;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  const formatted = `W${formattedWeek}-D${formattedDay}`;

  return {
    week,
    day,
    totalDays: safeTotalDays,
    formatted,
  };
}

/**
 * Reverse calculate estimated start date from a known past date and age
 * e.g. If on 2026-05-05 bird was Week 17, Day 3:
 * elapsedDays = (17 - 1) * 7 + 3 = 115 days
 * startDate = 2026-05-05 - 115 days
 */
export function calculateStartDateFromAge(
  referenceDateInput: Date | string,
  week: number,
  day: number
): {
  startDate: string; // YYYY-MM-DD
  elapsedDays: number;
} {
  const refDate = typeof referenceDateInput === 'string' ? parseISO(referenceDateInput) : referenceDateInput;
  const safeWeek = Math.max(1, Math.floor(Number(week) || 1));
  const safeDay = Math.max(0, Math.min(6, Math.floor(Number(day) || 0)));
  const elapsedDays = (safeWeek - 1) * 7 + safeDay;
  const startDateObj = subDays(refDate, elapsedDays);
  return {
    startDate: format(startDateObj, 'yyyy-MM-dd'),
    elapsedDays,
  };
}
