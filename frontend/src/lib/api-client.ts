import { DashboardData, Flock, HealthStatus, UnifiedDailyRecord } from '../types/index.js';

// Dynamically resolve API_BASE from VITE_API_URL env variable (supports cloud Render & local dev)
const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

function resolveApiBase(url: string): string {
  if (!url) return '/api/v1';
  const clean = url.replace(/\/+$/, '');
  if (clean.endsWith('/api/v1')) return clean;
  if (clean.endsWith('/api')) return `${clean}/v1`;
  return `${clean}/api/v1`;
}

export const API_BASE = resolveApiBase(rawApiUrl);

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};

  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
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
    companyName?: string;
    startDate: string;
    initialBirds: number;
    eggTrackingEnabled: boolean;
    isRunningFlock?: boolean;
    openingBalances?: {
      cumulativeMortality?: number;
      totalReceivedFeedBags?: number;
      remainingFeedBags?: number;
      totalProducedEggPeti?: number;
      totalProducedEggTrays?: number;
      remainingEggPeti?: number;
      remainingEggTrays?: number;
      remainingDieselLiters?: number;
      asOfDate?: string;
    };
  }) => fetchJson<Flock>('/flocks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateFlock: (flockId: string, data: { name?: string; companyName?: string; eggTrackingEnabled?: boolean }) =>
    fetchJson<Flock>(`/flocks/${flockId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  closeFlock: (flockId: string) =>
    fetchJson<Flock>(`/flocks/${flockId}/close`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  deleteFlock: (flockId: string) =>
    fetchJson<{ deleted: boolean; id: string }>(`/flocks/${flockId}`, {
      method: 'DELETE',
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

  getDieselReport: (flockId: string) =>
    fetchJson<{ flock?: Flock; rows: any[] }>(`/flocks/${flockId}/reports/diesel`),

  getChipsReport: (flockId: string) =>
    fetchJson<{ flock?: Flock; rows: any[] }>(`/flocks/${flockId}/reports/chips`),

  getTraysReport: (flockId: string) =>
    fetchJson<{ flock?: Flock; rows: any[] }>(`/flocks/${flockId}/reports/trays`),

  getWeightReport: (flockId: string) =>
    fetchJson<{ flock?: Flock; rows: any[] }>(`/flocks/${flockId}/reports/weight`),

  getHealthReport: (flockId: string) =>
    fetchJson<{ flock?: Flock; rows: any[] }>(`/flocks/${flockId}/reports/health`),

  // Medicines Master
  getMedicines: () => fetchJson<{ id: string; name: string; active: boolean }[]>('/medicines'),
};
