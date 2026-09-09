export interface Flock {
  id: string;
  farmId: string;
  flockCode: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  initialBirds: number;
  eggTrackingEnabled: boolean;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface BirdAge {
  week: number;
  day: number;
  totalDays: number;
  formatted: string;
}

export interface DashboardData {
  flock: {
    id: string;
    flockCode: string;
    name: string;
    startDate: string;
    initialBirds: number;
    status: 'active' | 'closed';
    eggTrackingEnabled: boolean;
  };
  selectedDate: string;
  birdAge: BirdAge;
  birds: {
    initial: number;
    todayMortality: number;
    cumulativeMortality: number;
    moat?: number;
    remaining: number;
    mortalityRate: number;
    moatPercentage?: number;
  };
  feed: {
    totalReceivedBags: number;
    totalUsedBags: number;
    remainingBags: number;
    todayUsedBags: number;
    consumptionGramsPerBird: number;
  };
  eggs: {
    enabled: boolean;
    currentStockEggs?: number;
    stockPeti?: number;
    stockTrays?: number;
    stockLooseEggs?: number;
    stockFormatted?: string;
    todayProductionPeti?: number;
    todayProductionTrays?: number;
    todayProductionEggs?: number;
    productionPercentage?: number;
    todaySoldPeti?: number;
    todaySoldTrays?: number;
    todayUsageEggs?: number;
    totalProductionEggs?: number;
  };
  diesel: {
    totalReceivedLiters: number;
    totalUsedLiters: number;
    remainingLiters: number;
    todayArrivalLiters: number;
    todayUsedLiters: number;
  };
  water: {
    liters: number;
    mlPerBird: number;
  };
  weight: {
    weight: number;
    uniformity: number;
    date: string;
  } | null;
  alerts: string[];
  trendData: {
    date: string;
    mortality: number;
    feedBags: number;
    eggProductionEggs: number;
  }[];
}

export interface UnifiedDailyRecord {
  flockId: string;
  date: string;
  flockStatus: 'active' | 'closed';
  eggTrackingEnabled: boolean;
  hasExistingRecord?: boolean;
  birds: {
    mortality: number;
    moat?: number;
    moatPercentage?: number;
    lightHours?: number | null;
    maxTemperature?: number | null;
    minTemperature?: number | null;
    manureRemoved?: boolean;
  };
  feed: {
    arrivalBags: number;
    usedBags: number;
    returnedBags?: number;
  };
  chips?: {
    arrivalBags: number;
    usedBags: number;
    returnedBags: number;
  };
  trays?: {
    plasticReceived: number;
    plasticUsed: number;
    cardboardReceived: number;
    cardboardUsed: number;
    cardboardWasted: number;
  };
  eggs: {
    productionPeti: number;
    productionTrays: number;
    soldPeti: number;
    soldTrays: number;
  };
  eggUsage: {
    id?: string;
    type: 'gift-use' | 'conveyor-waste' | 'mess-use' | 'store-waste';
    peti: number;
    trays: number;
  }[];
  diesel: {
    arrivalLiters: number;
    usedLiters: number;
  };
  weight: {
    weight: number;
    uniformity: number;
  } | null;
  medicine: {
    type: 'water' | 'medicine';
    waterLiters: number;
    medicines: {
      medicineId: string;
      name: string;
      dosagePerLiter?: number;
    }[];
  };
  vaccination: {
    vaccineName: string;
    notes?: string;
  } | null;
  priorBalances?: {
    previousFeedStockBags: number;
    totalArrivalBagsTillNow: number;
    totalReturnedBagsTillNow?: number;
    previousChipsStockBags?: number;
    totalChipsArrivalBagsTillNow?: number;
    totalChipsReturnedBagsTillNow?: number;
    previousPlasticStockTrays?: number;
    totalPlasticReceivedTrays?: number;
    previousCardboardStockTrays?: number;
    totalCardboardReceivedTrays?: number;
    totalCardboardWastedTrays?: number;
    previousEggStock: {
      peti: number;
      trays: number;
      looseEggs: number;
      formatted: string;
    };
    previousDieselStockLiters: number;
    birdAge: BirdAge;
  };
}

export interface HealthStatus {
  status: string;
  uptime: number;
  timestamp: string;
  connections: {
    database: {
      client: string;
      connected: boolean;
      error: string | null;
    };
    redis: {
      client: string;
      connected: boolean;
      error: string | null;
    };
  };
  fallbackStorageActive: boolean;
}
