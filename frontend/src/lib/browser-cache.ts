/**
 * Browser Cache Management System (3-Day TTL Validity)
 * 
 * Provides resilient, timestamped client-side storage for:
 * 1. Last active flock selection (persists across browser restarts, valid for 3 days)
 * 2. Critical farm data (flocks list, dashboard metrics, medicines master, daily logs)
 * 3. Daily record in-progress drafts (prevents data loss on browser refresh/close)
 * 4. TanStack Query cache hydration for instant, offline-first load
 */

export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 259,200,000 ms (3 days)
const CACHE_VERSION = 'v2';
const PREFIX = `farm_${CACHE_VERSION}_`;

export interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
  version: string;
}

export interface CacheEntryInfo {
  key: string;
  name: string;
  timestamp: number;
  expiresAt: number;
  remainingMs: number;
  isExpired: boolean;
  sizeBytes: number;
}

/**
 * Low-level safe storage wrapper
 */
class BrowserCacheManager {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = this.checkAvailability();
    if (this.isAvailable) {
      this.purgeExpired();
    }
  }

  private checkAvailability(): boolean {
    try {
      const testKey = `__farm_test_storage__`;
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Store data with specified TTL (defaults to 3 days)
   */
  set<T>(rawKey: string, data: T, ttlMs: number = THREE_DAYS_MS): boolean {
    if (!this.isAvailable) return false;
    try {
      const key = `${PREFIX}${rawKey}`;
      const envelope: CacheEnvelope<T> = {
        data,
        timestamp: Date.now(),
        ttlMs,
        version: CACHE_VERSION,
      };
      localStorage.setItem(key, JSON.stringify(envelope));
      return true;
    } catch (err) {
      // Quota exceeded: try purging expired keys and retry once
      try {
        this.purgeExpired();
        const key = `${PREFIX}${rawKey}`;
        const envelope: CacheEnvelope<T> = {
          data,
          timestamp: Date.now(),
          ttlMs,
          version: CACHE_VERSION,
        };
        localStorage.setItem(key, JSON.stringify(envelope));
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Retrieve cached data if within TTL. Returns null if expired or not found.
   */
  get<T>(rawKey: string): T | null {
    if (!this.isAvailable) return null;
    try {
      const key = `${PREFIX}${rawKey}`;
      const item = localStorage.getItem(key);
      if (!item) return null;

      const envelope: CacheEnvelope<T> = JSON.parse(item);
      const now = Date.now();
      const age = now - envelope.timestamp;

      if (age > envelope.ttlMs) {
        localStorage.removeItem(key);
        return null;
      }

      return envelope.data;
    } catch {
      return null;
    }
  }

  /**
   * Retrieve cached data along with remaining TTL metadata
   */
  getWithMeta<T>(rawKey: string): { data: T; remainingMs: number; cachedAt: Date; expiresAt: Date } | null {
    if (!this.isAvailable) return null;
    try {
      const key = `${PREFIX}${rawKey}`;
      const item = localStorage.getItem(key);
      if (!item) return null;

      const envelope: CacheEnvelope<T> = JSON.parse(item);
      const now = Date.now();
      const remainingMs = envelope.ttlMs - (now - envelope.timestamp);

      if (remainingMs <= 0) {
        localStorage.removeItem(key);
        return null;
      }

      return {
        data: envelope.data,
        remainingMs,
        cachedAt: new Date(envelope.timestamp),
        expiresAt: new Date(envelope.timestamp + envelope.ttlMs),
      };
    } catch {
      return null;
    }
  }

  /**
   * Remove a specific key from cache
   */
  remove(rawKey: string): void {
    if (!this.isAvailable) return;
    try {
      localStorage.removeItem(`${PREFIX}${rawKey}`);
      // Also clean legacy un-prefixed keys if any
      localStorage.removeItem(rawKey);
    } catch {
      // Ignore
    }
  }

  /**
   * Purge all expired items belonging to the system
   */
  purgeExpired(): number {
    if (!this.isAvailable) return 0;
    let purged = 0;
    try {
      const now = Date.now();
      const keysToInspect: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) {
          keysToInspect.push(key);
        }
      }

      for (const key of keysToInspect) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const envelope = JSON.parse(item);
            if (envelope.timestamp && envelope.ttlMs && (now - envelope.timestamp > envelope.ttlMs)) {
              localStorage.removeItem(key);
              purged++;
            }
          }
        } catch {
          localStorage.removeItem(key);
          purged++;
        }
      }
    } catch {
      // Ignore
    }
    return purged;
  }

  /**
   * Clear all farm application cache entries
   */
  clearAll(): void {
    if (!this.isAvailable) return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(PREFIX) || key.startsWith('active_flock_id'))) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * List all stored farm cache entries for audit / settings view
   */
  getDiagnostics(): { totalEntries: number; totalSizeBytes: number; entries: CacheEntryInfo[] } {
    if (!this.isAvailable) return { totalEntries: 0, totalSizeBytes: 0, entries: [] };
    const entries: CacheEntryInfo[] = [];
    let totalSizeBytes = 0;
    const now = Date.now();

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) {
          const rawItem = localStorage.getItem(key) || '';
          const sizeBytes = key.length + rawItem.length * 2; // rough UTF-16 byte estimation
          totalSizeBytes += sizeBytes;

          try {
            const env = JSON.parse(rawItem);
            const remainingMs = Math.max(0, (env.ttlMs || THREE_DAYS_MS) - (now - (env.timestamp || 0)));
            entries.push({
              key,
              name: key.replace(PREFIX, ''),
              timestamp: env.timestamp || 0,
              expiresAt: (env.timestamp || 0) + (env.ttlMs || THREE_DAYS_MS),
              remainingMs,
              isExpired: remainingMs <= 0,
              sizeBytes,
            });
          } catch {
            // Unparseable
          }
        }
      }
    } catch {
      // Ignore
    }

    return {
      totalEntries: entries.length,
      totalSizeBytes,
      entries: entries.sort((a, b) => b.timestamp - a.timestamp),
    };
  }
}

export const browserCache = new BrowserCacheManager();

// ===================================================================
// Domain-Specific 3-Day Cache Helpers
// ===================================================================

export interface CachedActiveFlock {
  id: string;
  flockCode?: string;
  name?: string;
  startDate?: string;
  initialBirds?: number;
  eggTrackingEnabled?: boolean;
  status?: string;
  cachedAt: string;
}

const ACTIVE_FLOCK_KEY = 'active_flock_session';

/**
 * Saves the active flock to browser cache with 3-day validity.
 * Also keeps legacy key for backwards compatibility.
 */
export function saveActiveFlockCache(flock: {
  id: string;
  flockCode?: string;
  name?: string;
  startDate?: string;
  initialBirds?: number;
  eggTrackingEnabled?: boolean;
  status?: string;
}): void {
  const payload: CachedActiveFlock = {
    id: flock.id,
    flockCode: flock.flockCode,
    name: flock.name,
    startDate: flock.startDate,
    initialBirds: flock.initialBirds,
    eggTrackingEnabled: flock.eggTrackingEnabled,
    status: flock.status,
    cachedAt: new Date().toISOString(),
  };

  browserCache.set(ACTIVE_FLOCK_KEY, payload, THREE_DAYS_MS);

  // Sync legacy localStorage string for instant component hydration
  try {
    localStorage.setItem('active_flock_id', flock.id);
  } catch {
    // Ignore
  }
}

/**
 * Retrieves the last active flock from browser cache if still valid (<= 3 days).
 * Returns null if expired (> 3 days) or absent.
 */
export function getActiveFlockCache(): CachedActiveFlock | null {
  const cached = browserCache.get<CachedActiveFlock>(ACTIVE_FLOCK_KEY);
  if (!cached) {
    // Check if legacy key exists and hasn't been migrated
    try {
      const legacyId = localStorage.getItem('active_flock_id');
      if (legacyId) {
        // Wrap it in a 3-day envelope
        saveActiveFlockCache({ id: legacyId });
        return { id: legacyId, cachedAt: new Date().toISOString() };
      }
    } catch {
      // Ignore
    }
    return null;
  }
  return cached;
}

/**
 * Retrieves active flock with remaining expiration time in milliseconds
 */
export function getActiveFlockWithExpiry(): {
  flock: CachedActiveFlock;
  remainingHours: number;
  expiresAt: Date;
} | null {
  const meta = browserCache.getWithMeta<CachedActiveFlock>(ACTIVE_FLOCK_KEY);
  if (!meta) return null;
  return {
    flock: meta.data,
    remainingHours: Number((meta.remainingMs / (1000 * 60 * 60)).toFixed(1)),
    expiresAt: meta.expiresAt,
  };
}

/**
 * Purge active flock from browser cache (used on explicit flock deletion)
 */
export function clearActiveFlockCache(): void {
  browserCache.remove(ACTIVE_FLOCK_KEY);
  try {
    localStorage.removeItem('active_flock_id');
  } catch {
    // Ignore
  }
}

// -------------------------------------------------------------------
// Important Data Caching (Flocks list, Dashboard metrics, Medicines)
// -------------------------------------------------------------------

export function cacheFlocksList(flocks: any[]): void {
  browserCache.set('important_flocks_list', flocks, THREE_DAYS_MS);
}

export function getCachedFlocksList(): any[] | null {
  return browserCache.get<any[]>('important_flocks_list');
}

export function cacheDashboardData(flockId: string, data: any): void {
  browserCache.set(`important_dashboard_${flockId}`, data, THREE_DAYS_MS);
}

export function getCachedDashboardData(flockId: string): any | null {
  return browserCache.get<any>(`important_dashboard_${flockId}`);
}

export function cacheMedicinesList(medicines: any[]): void {
  browserCache.set('important_medicines_master', medicines, THREE_DAYS_MS);
}

export function getCachedMedicinesList(): any[] | null {
  return browserCache.get<any[]>('important_medicines_master');
}

// -------------------------------------------------------------------
// Daily Record In-Progress Drafts (Resilient input saving)
// -------------------------------------------------------------------

export function saveDailyDraft(flockId: string, date: string, draft: any): void {
  browserCache.set(`daily_draft_${flockId}_${date}`, draft, THREE_DAYS_MS);
}

export function getDailyDraft(flockId: string, date: string): any | null {
  return browserCache.get<any>(`daily_draft_${flockId}_${date}`);
}

export function clearDailyDraft(flockId: string, date: string): void {
  browserCache.remove(`daily_draft_${flockId}_${date}`);
}
