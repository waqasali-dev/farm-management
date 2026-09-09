import { QueryClient } from '@tanstack/react-query';
import {
  browserCache,
  THREE_DAYS_MS,
  cacheFlocksList,
  getCachedFlocksList,
  cacheMedicinesList,
  getCachedMedicinesList,
  cacheDashboardData,
  getCachedDashboardData,
  getActiveFlockCache,
} from './browser-cache.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: THREE_DAYS_MS, // Retain inactive queries in memory for up to 3 days
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 1. Hydrate memory cache instantly from browser persistent cache on app startup
try {
  const cachedFlocks = getCachedFlocksList();
  if (cachedFlocks && Array.isArray(cachedFlocks) && cachedFlocks.length > 0) {
    queryClient.setQueryData(['flocks'], cachedFlocks);
  }

  const cachedMedicines = getCachedMedicinesList();
  if (cachedMedicines && Array.isArray(cachedMedicines) && cachedMedicines.length > 0) {
    queryClient.setQueryData(['medicines'], cachedMedicines);
  }

  const activeFlock = getActiveFlockCache();
  if (activeFlock?.id) {
    const cachedDashboard = getCachedDashboardData(activeFlock.id);
    if (cachedDashboard) {
      queryClient.setQueryData(['dashboard', activeFlock.id], cachedDashboard);
    }
  }
} catch {
  // Graceful fallback if storage corrupted
}

// 2. Subscribe to query cache updates and sync important datasets into browser cache (3-day TTL)
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'updated' && event?.action?.type === 'success') {
    const queryKey = event.query.queryKey;
    const data = event.query.state.data;
    if (!data) return;

    try {
      if (queryKey[0] === 'flocks') {
        if (queryKey.length === 1 || queryKey[1] === undefined || queryKey[1] === 'all') {
          cacheFlocksList(data as any[]);
        }
      } else if (queryKey[0] === 'medicines') {
        cacheMedicinesList(data as any[]);
      } else if (queryKey[0] === 'dashboard' && queryKey[1]) {
        cacheDashboardData(String(queryKey[1]), data);
      }
    } catch {
      // Ignore background sync errors
    }
  }
});
