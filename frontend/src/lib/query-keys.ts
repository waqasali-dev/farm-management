/**
 * Structured TanStack Query Keys (Section 31)
 */
export const queryKeys = {
  flocks: {
    all: () => ['flocks'] as const,
    list: (status?: string) => ['flocks', { status }] as const,
    detail: (flockId: string) => ['flock', flockId] as const,
  },
  dashboard: (flockId: string, date: string) => ['dashboard', flockId, date] as const,
  dailyRecord: (flockId: string, date: string) => ['daily-record', flockId, date] as const,
  reports: (flockId: string, type: string) => ['reports', flockId, type] as const,
  medicines: () => ['medicines'] as const,
  health: () => ['health'] as const,
};
