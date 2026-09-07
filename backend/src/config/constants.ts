export const CONSTANTS = {
  // Feed unit conversions
  FEED: {
    BAG_WEIGHT_KG: 50,
    BAG_WEIGHT_GRAMS: 50000,
  },
  // Egg unit conversions
  EGGS: {
    EGGS_PER_TRAY: 30,
    TRAYS_PER_PETI: 12,
    EGGS_PER_PETI: 360, // 12 * 30
  },
  // Egg usage categories (Strict business spec)
  EGG_USAGE_TYPES: [
    'gift-use',
    'conveyor-waste',
    'mess-use',
    'store-waste',
  ] as const,
  // Medicine daily entry types
  MEDICINE_TYPES: ['water', 'medicine'] as const,
  // Flock status
  FLOCK_STATUS: ['active', 'closed'] as const,
} as const;
