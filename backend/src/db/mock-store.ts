import { CONSTANTS } from '../config/constants.js';
import {
  calculateRemainingBirds,
  calculateMortalityPercentage,
  calculateRemainingFeedBags,
  calculateFeedConsumptionGramsPerBird,
  petiTraysToEggs,
  eggsToPetiTrays,
  calculateProductionPercentage,
  calculateRemainingEggStock,
  calculateRemainingDieselLiters,
  calculateBirdAge,
  calculateWaterPerBirdMl,
} from '../calculations/index.js';

export interface MockFarm {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockUser {
  id: string;
  email: string;
  password: string;
  name?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface MockFlock {
  id: string;
  userId?: string;
  farmId: string;
  flockCode: string;
  name: string;
  companyName?: string;
  startDate: string; // YYYY-MM-DD
  initialBirds: number;
  eggTrackingEnabled: boolean;
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date | null;
}

export interface MockBirdRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  mortality: number;
  lightHours?: number | null;
  maxTemperature?: number | null;
  minTemperature?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockFeedRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  arrivalBags: number;
  usedBags: number;
  returnedBags: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockChipsRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  arrivalBags: number;
  usedBags: number;
  returnedBags: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockTrayRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  plasticReceived: number;
  plasticUsed: number;
  cardboardReceived: number;
  cardboardUsed: number;
  cardboardWasted: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockEggRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  productionPeti: number;
  productionTrays: number;
  cumulativeProductionPeti?: number;
  cumulativeProductionTrays?: number;
  soldPeti: number;
  soldTrays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockEggUsageRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  type: string;
  peti: number;
  trays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockDieselRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  arrivalLiters: number;
  usedLiters: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockWeightRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  weight: number;
  uniformity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockMedicine {
  id: string;
  farmId: string;
  name: string;
  active: boolean;
}

export interface MockMedicineDailyRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  type: 'water' | 'medicine';
  waterLiters: number;
  medicines: { medicineId: string; name: string; dosagePerLiter?: number; dosageUnit?: 'ml' | 'gm'; ratio?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MockVaccinationRecord {
  id: string;
  farmId: string;
  flockId: string;
  date: string;
  vaccineName: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Initial Seed Data (Section 52)
const DEMO_FARM_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const FLOCK_1_ID = '7d8c0001-4372-4bc1-9e01-0e02b2c3d480';
const FLOCK_2_ID = '7d8c0002-4372-4bc1-9e02-0e02b2c3d481';

class MockDataStore {
  users: MockUser[] = [
    {
      id: '080adba0-ce7a-47c6-a018-64be909fcebd',
      email: 'admin@farm.com',
      password: '',
      name: 'Farm Administrator',
      role: 'admin',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: '8d921479-e8b0-41cc-b864-4316de97b4e1',
      email: 'mujeeb@gmail.com',
      password: '',
      name: 'Mujeeb',
      role: 'user',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  farms: MockFarm[] = [
    {
      id: DEMO_FARM_ID,
      name: 'Central Poultry Estate',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  flocks: MockFlock[] = [
    {
      id: FLOCK_1_ID,
      userId: '8d921479-e8b0-41cc-b864-4316de97b4e1',
      farmId: DEMO_FARM_ID,
      flockCode: 'FL-001',
      name: 'Layer Flock Alpha (High Yield)',
      companyName: 'S. S. FEED MILLS (PVT) LTD',
      startDate: '2026-08-01',
      initialBirds: 99000,
      eggTrackingEnabled: true,
      status: 'active',
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-01'),
      closedAt: null,
    },
    {
      id: FLOCK_2_ID,
      userId: '8d921479-e8b0-41cc-b864-4316de97b4e1',
      farmId: DEMO_FARM_ID,
      flockCode: 'FL-002',
      name: 'Broiler Flock Beta (Meat Batch)',
      companyName: 'S. S. FEED MILLS (PVT) LTD',
      startDate: '2026-08-15',
      initialBirds: 50000,
      eggTrackingEnabled: false,
      status: 'active',
      createdAt: new Date('2026-08-15'),
      updatedAt: new Date('2026-08-15'),
      closedAt: null,
    },
  ];

  birdRecords: MockBirdRecord[] = [
    {
      id: 'b-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-05',
      mortality: 25,
      lightHours: 16.0,
      maxTemperature: 28.5,
      minTemperature: 22.0,
      createdAt: new Date('2026-09-05'),
      updatedAt: new Date('2026-09-05'),
    },
    {
      id: 'b-02',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-06',
      mortality: 18,
      lightHours: 16.0,
      maxTemperature: 29.0,
      minTemperature: 22.5,
      createdAt: new Date('2026-09-06'),
      updatedAt: new Date('2026-09-06'),
    },
    {
      id: 'b-03',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-07',
      mortality: 22,
      lightHours: 16.5,
      maxTemperature: 30.0,
      minTemperature: 23.0,
      createdAt: new Date('2026-09-07'),
      updatedAt: new Date('2026-09-07'),
    },
  ];

  feedRecords: MockFeedRecord[] = [
    {
      id: 'f-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-05',
      arrivalBags: 300,
      usedBags: 210,
      returnedBags: 0,
      createdAt: new Date('2026-09-05'),
      updatedAt: new Date('2026-09-05'),
    },
    {
      id: 'f-02',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-06',
      arrivalBags: 0,
      usedBags: 215,
      returnedBags: 0,
      createdAt: new Date('2026-09-06'),
      updatedAt: new Date('2026-09-06'),
    },
    {
      id: 'f-03',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-07',
      arrivalBags: 200,
      usedBags: 218,
      returnedBags: 0,
      createdAt: new Date('2026-09-07'),
      updatedAt: new Date('2026-09-07'),
    },
  ];

  chipsRecords: MockChipsRecord[] = [
    {
      id: 'ch-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-05',
      arrivalBags: 50,
      usedBags: 10,
      returnedBags: 0,
      createdAt: new Date('2026-09-05'),
      updatedAt: new Date('2026-09-05'),
    },
    {
      id: 'ch-02',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-06',
      arrivalBags: 0,
      usedBags: 12,
      returnedBags: 0,
      createdAt: new Date('2026-09-06'),
      updatedAt: new Date('2026-09-06'),
    },
    {
      id: 'ch-03',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-07',
      arrivalBags: 20,
      usedBags: 10,
      returnedBags: 0,
      createdAt: new Date('2026-09-07'),
      updatedAt: new Date('2026-09-07'),
    },
  ];

  trayRecords: MockTrayRecord[] = [
    {
      id: 'tr-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-05',
      plasticReceived: 500,
      plasticUsed: 120,
      cardboardReceived: 1000,
      cardboardUsed: 250,
      cardboardWasted: 15,
      createdAt: new Date('2026-09-05'),
      updatedAt: new Date('2026-09-05'),
    },
    {
      id: 'tr-02',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-06',
      plasticReceived: 0,
      plasticUsed: 140,
      cardboardReceived: 0,
      cardboardUsed: 260,
      cardboardWasted: 10,
      createdAt: new Date('2026-09-06'),
      updatedAt: new Date('2026-09-06'),
    },
    {
      id: 'tr-03',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-07',
      plasticReceived: 200,
      plasticUsed: 130,
      cardboardReceived: 500,
      cardboardUsed: 240,
      cardboardWasted: 12,
      createdAt: new Date('2026-09-07'),
      updatedAt: new Date('2026-09-07'),
    },
  ];

  eggRecords: MockEggRecord[] = [
    {
      id: 'e-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-05',
      productionPeti: 270,
      productionTrays: 6,
      soldPeti: 250,
      soldTrays: 0,
      createdAt: new Date('2026-09-05'),
      updatedAt: new Date('2026-09-05'),
    },
    {
      id: 'e-02',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-06',
      productionPeti: 275,
      productionTrays: 4,
      soldPeti: 270,
      soldTrays: 0,
      createdAt: new Date('2026-09-06'),
      updatedAt: new Date('2026-09-06'),
    },
    {
      id: 'e-03',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-07',
      productionPeti: 276,
      productionTrays: 8,
      soldPeti: 260,
      soldTrays: 5,
      createdAt: new Date('2026-09-07'),
      updatedAt: new Date('2026-09-07'),
    },
  ];

  eggUsageRecords: MockEggUsageRecord[] = [
    {
      id: 'u-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-05',
      type: 'mess-use',
      peti: 1,
      trays: 0,
      createdAt: new Date('2026-09-05'),
      updatedAt: new Date('2026-09-05'),
    },
    {
      id: 'u-02',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-06',
      type: 'conveyor-waste',
      peti: 0,
      trays: 5,
      createdAt: new Date('2026-09-06'),
      updatedAt: new Date('2026-09-06'),
    },
    {
      id: 'u-03',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-07',
      type: 'store-waste',
      peti: 0,
      trays: 3,
      createdAt: new Date('2026-09-07'),
      updatedAt: new Date('2026-09-07'),
    },
  ];

  dieselRecords: MockDieselRecord[] = [
    {
      id: 'd-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-05',
      arrivalLiters: 1500,
      usedLiters: 120,
      createdAt: new Date('2026-09-05'),
      updatedAt: new Date('2026-09-05'),
    },
    {
      id: 'd-02',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-06',
      arrivalLiters: 0,
      usedLiters: 135,
      createdAt: new Date('2026-09-06'),
      updatedAt: new Date('2026-09-06'),
    },
    {
      id: 'd-03',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-07',
      arrivalLiters: 500,
      usedLiters: 110,
      createdAt: new Date('2026-09-07'),
      updatedAt: new Date('2026-09-07'),
    },
  ];

  weightRecords: MockWeightRecord[] = [
    {
      id: 'w-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-08-30',
      weight: 1650,
      uniformity: 86.5,
      createdAt: new Date('2026-08-30'),
      updatedAt: new Date('2026-08-30'),
    },
    {
      id: 'w-02',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-06',
      weight: 1720,
      uniformity: 88.0,
      createdAt: new Date('2026-09-06'),
      updatedAt: new Date('2026-09-06'),
    },
  ];

  medicines: MockMedicine[] = [
    { id: 'm-01', farmId: DEMO_FARM_ID, name: 'Vitamin AD3E', active: true },
    { id: 'm-02', farmId: DEMO_FARM_ID, name: 'Electrolytes Oral', active: true },
    { id: 'm-03', farmId: DEMO_FARM_ID, name: 'Calcium + D3 Supplement', active: true },
    { id: 'm-04', farmId: DEMO_FARM_ID, name: 'Liver Tonic Pro', active: true },
  ];

  medicineDailyRecords: MockMedicineDailyRecord[] = [
    {
      id: 'md-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-09-07',
      type: 'medicine',
      waterLiters: 18500,
      medicines: [
        { medicineId: 'm-01', name: 'Vitamin AD3E', dosagePerLiter: 1.5 },
        { medicineId: 'm-03', name: 'Calcium + D3 Supplement', dosagePerLiter: 2.0 },
      ],
      createdAt: new Date('2026-09-07'),
      updatedAt: new Date('2026-09-07'),
    },
  ];

  vaccinationRecords: MockVaccinationRecord[] = [
    {
      id: 'v-01',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-08-10',
      vaccineName: 'ND + IB Live Vaccine',
      notes: 'Administered via eye drop method without adverse reactions.',
      createdAt: new Date('2026-08-10'),
      updatedAt: new Date('2026-08-10'),
    },
    {
      id: 'v-02',
      farmId: DEMO_FARM_ID,
      flockId: FLOCK_1_ID,
      date: '2026-08-28',
      vaccineName: 'Infectious Bursal Disease (Gumboro)',
      notes: 'Drinking water route with skimmed milk powder stabilizer.',
      createdAt: new Date('2026-08-28'),
      updatedAt: new Date('2026-08-28'),
    },
  ];
}

export const mockStore = new MockDataStore();
