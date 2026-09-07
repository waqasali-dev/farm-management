import { DashboardData, Flock, HealthStatus, UnifiedDailyRecord } from '../types/index.js';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const payload = await res.json();
  if (!res.ok || payload.error) {
    const message = payload.error?.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return payload.data;
}

export const api = {
  // System Health
  getHealth: () => fetchJson<HealthStatus>('/health'),

  // Flocks
  getFlocks: (status?: 'active' | 'closed') =>
    fetchJson<Flock[]>(status ? `/flocks?status=${status}` : '/flocks'),

  getFlock: (flockId: string) =>
    fetchJson<Flock>(`/flocks/${flockId}`),

  createFlock: (data: {
    name: string;
    startDate: string;
    initialBirds: number;
    eggTrackingEnabled: boolean;
    isRunningFlock?: boolean;
    openingBalances?: {
      cumulativeMortality?: number;
      remainingFeedBags?: number;
      remainingEggPeti?: number;
      remainingEggTrays?: number;
      remainingDieselLiters?: number;
      asOfDate?: string;
    };
  }) => fetchJson<Flock>('/flocks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  closeFlock: (flockId: string) =>
    fetchJson<Flock>(`/flocks/${flockId}/close`, {
      method: 'POST',
    }),

  // Dashboard
  getDashboard: (flockId: string, date?: string) =>
    fetchJson<DashboardData>(`/flocks/${flockId}/dashboard${date ? `?date=${date}` : ''}`),

  // Unified Daily Record
  getDailyRecord: (flockId: string, date: string) =>
    fetchJson<UnifiedDailyRecord>(`/flocks/${flockId}/daily-record?date=${date}`),

  saveDailyRecord: (flockId: string, payload: any) =>
    fetchJson<{ message: string; flockId: string; date: string }>(`/flocks/${flockId}/daily-record`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Reports
  getSummaryReport: (flockId: string) =>
    fetchJson<{ flock: Flock; rows: any[] }>(`/flocks/${flockId}/reports/summary`),

  getFeedReport: (flockId: string) =>
    fetchJson<{ rows: any[] }>(`/flocks/${flockId}/reports/feed`),

  getEggsReport: (flockId: string) =>
    fetchJson<{ rows: any[]; enabled: boolean }>(`/flocks/${flockId}/reports/eggs`),

  getMortalityReport: (flockId: string) =>
    fetchJson<{ flock: Flock; rows: any[] }>(`/flocks/${flockId}/reports/mortality`),

  // Medicines Master
  getMedicines: () => fetchJson<{ id: string; name: string; active: boolean }[]>('/medicines'),
};
