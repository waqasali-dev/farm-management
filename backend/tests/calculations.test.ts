import { describe, it, expect } from 'vitest';
import {
  calculateRemainingBirds,
  calculateMortalityPercentage,
  bagsToKg,
  calculateRemainingFeedBags,
  calculateFeedConsumptionGramsPerBird,
  petiTraysToEggs,
  eggsToPetiTrays,
  calculateProductionPercentage,
  calculateRemainingDieselLiters,
  calculateBirdAge,
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

    it('calculates remaining feed bags', () => {
      const remaining = calculateRemainingFeedBags(500, 210);
      expect(remaining).toBe(290);
    });

    it('prevents negative feed inventory', () => {
      expect(() => calculateRemainingFeedBags(100, 150)).toThrow();
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
    it('observes Sunday = Day 00 convention', () => {
      // 2026-09-06 is Sunday
      const ageSunday = calculateBirdAge('2026-09-06', '2026-08-01');
      expect(ageSunday.day).toBe(0); // Sunday = Day 00
      expect(ageSunday.formatted).toContain('-D00');

      // 2026-09-07 is Monday
      const ageMonday = calculateBirdAge('2026-09-07', '2026-08-01');
      expect(ageMonday.day).toBe(1); // Monday = Day 01
      expect(ageMonday.formatted).toContain('-D01');
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
