import { differenceInCalendarDays, parseISO, subDays, format } from 'date-fns';

/**
 * Bird Age & Weight Week/Day Calculation
 * Poultry lifecycle age is calculated relative to flock placement date:
 * Placement date (targetDate === startDate): Week 01, Day 01 (W01-D01)
 * Day runs 1 through 7 within each week (Day 01 to Day 07).
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

  // Flock Age calculation:
  // Starts on placement date (targetDate === startDate) as Week 01, Day 01.
  // Day runs 1 through 7 within each week:
  // safeTotalDays = 0 => week 1, day 1 (W01-D01)
  // safeTotalDays = 6 => week 1, day 7 (W01-D07)
  // safeTotalDays = 7 => week 2, day 1 (W02-D01)
  const week = Math.floor(safeTotalDays / 7) + 1;
  const day = (safeTotalDays % 7) + 1;

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
 * elapsedDays = (17 - 1) * 7 + (3 - 1) = 114 days
 * startDate = 2026-05-05 - 114 days
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
  const safeDay = Math.max(1, Math.min(7, Math.floor(Number(day) || 1)));
  const elapsedDays = (safeWeek - 1) * 7 + (safeDay - 1);
  const startDateObj = subDays(refDate, elapsedDays);
  return {
    startDate: format(startDateObj, 'yyyy-MM-dd'),
    elapsedDays,
  };
}
