import { differenceInCalendarDays, parseISO } from 'date-fns';

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
