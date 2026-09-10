import { describe, it, expect } from 'vitest';
import {
  calculateRemainingBirds,
  calculateMortalityPercentage,
  bagsToKg,
  calculateRemainingFeedBags,
  calculateFeedConsumptionGramsPerBird,
  petiTraysToEggs,
  eggsToPetiTrays,
  normalizePetiTrays,
  sumPetiTrays,
  calculateProductionPercentage,
  calculateRemainingDieselLiters,
  calculateBirdAge,
  calculateStartDateFromAge,
  calculateWaterPerBirdMl,
} from '../src/calculations/index.js';

describe('Calculation Engine (Section 53)', () => {
  describe('Bird Calculations', () => {
    it('calculates remaining birds correctly', () => {
      const initial = 99000;
      const remaining1 = calculateRemainingBirds(initial, 25);
      expect(remaining1).toBe(98975);

      const remaining2 = calculateRemainingBirds(initial, 25 + 18);
      expect(remaining2).toBe(98957);
    });

    it('calculates mortality percentage correctly', () => {
      const pct = calculateMortalityPercentage(43, 99000);
      expect(pct).toBe(0.04);
    });

    it('throws error when cumulative mortality exceeds initial birds', () => {
      expect(() => calculateRemainingBirds(100, 105)).toThrow();
    });
  });

  describe('Feed Calculations', () => {
    it('converts bags to kg correctly (1 bag = 50 kg)', () => {
      expect(bagsToKg(10)).toBe(500);
      expect(bagsToKg(1)).toBe(50);
    });

    it('calculates remaining feed bags with returned bags', () => {
      // 500 arrived - 210 used - 30 returned = 260 bags remaining
      const remaining = calculateRemainingFeedBags(500, 210, 30);
      expect(remaining).toBe(260);
    });

    it('prevents negative feed inventory including returns', () => {
      expect(() => calculateRemainingFeedBags(100, 80, 30)).toThrow();
    });

    it('calculates feed consumption in grams per bird', () => {
      // 210 bags * 50,000 grams / 98,957 birds = 106.11 g/bird
      const gPerBird = calculateFeedConsumptionGramsPerBird(210, 98957);
      expect(gPerBird).toBe(106.11);
    });
  });

  describe('Egg Unit System & Conversions', () => {
    it('verifies 12 peti + 7 trays = 151 trays = 4,530 eggs', () => {
      // 12 peti * 12 trays/peti + 7 trays = 151 trays
      const totalTrays = 12 * 12 + 7;
      expect(totalTrays).toBe(151);

      // 12 * 360 + 7 * 30 = 4320 + 210 = 4530 eggs
      const totalEggs = petiTraysToEggs(12, 7);
      expect(totalEggs).toBe(4530);
    });

    it('verifies 43 trays = 3 peti + 7 trays', () => {
      const totalEggs = 43 * 30; // 1290 eggs
      const breakdown = eggsToPetiTrays(totalEggs);
      expect(breakdown.peti).toBe(3);
      expect(breakdown.trays).toBe(7);
      expect(breakdown.looseEggs).toBe(0);
    });

    it('tests egg boundary cases: 0, 1, 11, 12, 13, 359, 360, 361', () => {
      expect(eggsToPetiTrays(0)).toEqual({ peti: 0, trays: 0, looseEggs: 0, formatted: '0 Peti, 0 Trays' });
      expect(eggsToPetiTrays(1)).toEqual({ peti: 0, trays: 0, looseEggs: 1, formatted: '0 Peti, 0 Trays, 1 Eggs' });
      expect(eggsToPetiTrays(30)).toEqual({ peti: 0, trays: 1, looseEggs: 0, formatted: '0 Peti, 1 Trays' });
      expect(eggsToPetiTrays(359)).toEqual({ peti: 0, trays: 11, looseEggs: 29, formatted: '0 Peti, 11 Trays, 29 Eggs' });
      expect(eggsToPetiTrays(360)).toEqual({ peti: 1, trays: 0, looseEggs: 0, formatted: '1 Peti, 0 Trays' });
      expect(eggsToPetiTrays(361)).toEqual({ peti: 1, trays: 0, looseEggs: 1, formatted: '1 Peti, 0 Trays, 1 Eggs' });
    });

    it('calculates egg production percentage: 275 peti + 4 trays for 98,500 birds = 100.63%', () => {
      const productionEggs = petiTraysToEggs(275, 4);
      expect(productionEggs).toBe(99120);

      const pct = calculateProductionPercentage(productionEggs, 98500);
      expect(pct).toBe(100.63);
    });

    it('prevents negative egg stock', () => {
      expect(() => eggsToPetiTrays(-50)).toThrow();
    });

    it('normalizes peti and trays strictly ensuring trays < 12 (12 trays = 1 peti rule)', () => {
      // 0 peti, 12 trays => 1 peti, 0 trays
      const res12 = normalizePetiTrays(0, 12);
      expect(res12.peti).toBe(1);
      expect(res12.trays).toBe(0);
      expect(res12.totalTrays).toBe(12);
      expect(res12.totalEggs).toBe(360);
      expect(res12.formatted).toBe('1 Peti, 0 Trays');

      // 5 peti, 25 trays => (5*12 + 25) = 85 trays => 7 peti, 1 tray
      const res25 = normalizePetiTrays(5, 25);
      expect(res25.peti).toBe(7);
      expect(res25.trays).toBe(1);
      expect(res25.totalTrays).toBe(85);
      expect(res25.totalEggs).toBe(2550);
      expect(res25.formatted).toBe('7 Peti, 1 Trays');

      // Boundary: 11 trays remains 11 trays
      const res11 = normalizePetiTrays(2, 11);
      expect(res11.peti).toBe(2);
      expect(res11.trays).toBe(11);
      expect(res11.formatted).toBe('2 Peti, 11 Trays');
    });

    it('sums series of petis and trays via tray conversion and returns canonical form', () => {
      // 1 peti 8 trays + 2 peti 9 trays = 1*12+8 (20) + 2*12+9 (33) = 53 trays = 4 peti 5 trays
      const sumRes = sumPetiTrays([
        { peti: 1, trays: 8 },
        { peti: 2, trays: 9 },
      ]);
      expect(sumRes.peti).toBe(4);
      expect(sumRes.trays).toBe(5);
      expect(sumRes.totalTrays).toBe(53);
      expect(sumRes.totalEggs).toBe(1590);
      expect(sumRes.formatted).toBe('4 Peti, 5 Trays');
    });
  });

  describe('Diesel Calculations', () => {
    it('calculates remaining diesel liters accurately', () => {
      const remaining = calculateRemainingDieselLiters(2000, 120.5);
      expect(remaining).toBe(1879.5);
    });

    it('prevents negative diesel stock', () => {
      expect(() => calculateRemainingDieselLiters(100, 150)).toThrow();
    });
  });

  describe('Bird Age & Day Convention', () => {
    it('calculates flock age starting at Week 01, Day 01 on placement date regardless of weekday', () => {
      // Flock placed on 2026-05-05 (Tuesday) -> Day 01 of Week 01
      const day1 = calculateBirdAge('2026-05-05', '2026-05-05');
      expect(day1.day).toBe(1);
      expect(day1.week).toBe(1);
      expect(day1.totalDays).toBe(0);
      expect(day1.formatted).toBe('W01-D01');

      // Next day: 2026-05-06 -> Day 02 of Week 01
      const day2 = calculateBirdAge('2026-05-06', '2026-05-05');
      expect(day2.day).toBe(2);
      expect(day2.week).toBe(1);
      expect(day2.totalDays).toBe(1);
      expect(day2.formatted).toBe('W01-D02');

      // 7th day: 2026-05-11 -> Day 07 of Week 01
      const day7 = calculateBirdAge('2026-05-11', '2026-05-05');
      expect(day7.day).toBe(7);
      expect(day7.week).toBe(1);
      expect(day7.totalDays).toBe(6);
      expect(day7.formatted).toBe('W01-D07');

      // 8th day: 2026-05-12 -> Day 01 of Week 02
      const day8 = calculateBirdAge('2026-05-12', '2026-05-05');
      expect(day8.day).toBe(1);
      expect(day8.week).toBe(2);
      expect(day8.totalDays).toBe(7);
      expect(day8.formatted).toBe('W02-D01');
    });

    it('calculates flock start date from reference date and known age (Week 17, Day 03 on 2026-05-05)', () => {
      // Elapsed days = (17 - 1) * 7 + (3 - 1) = 112 + 2 = 114 days
      const result = calculateStartDateFromAge('2026-05-05', 17, 3);
      expect(result.elapsedDays).toBe(114);
      expect(result.startDate).toBe('2026-01-11');

      // Verify reverse calculation matches Week 17 Day 3 and 114 totalDays
      const ageAtRef = calculateBirdAge('2026-05-05', result.startDate);
      expect(ageAtRef.week).toBe(17);
      expect(ageAtRef.day).toBe(3);
      expect(ageAtRef.totalDays).toBe(114);
      expect(ageAtRef.formatted).toBe('W17-D03');

      // Verify calculation for 2026-09-09
      const ageToday = calculateBirdAge('2026-09-09', result.startDate);
      expect(ageToday.totalDays).toBe(241);
      expect(ageToday.week).toBe(35);
      expect(ageToday.day).toBe(4);
    });
  });

  describe('Water per Bird', () => {
    it('calculates water ml per bird correctly', () => {
      // 18,500 L * 1000 ml / 98,957 birds = 186.95 ml/bird
      const mlPerBird = calculateWaterPerBirdMl(18500, 98957);
      expect(mlPerBird).toBe(186.95);
    });
  });
});
