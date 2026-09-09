import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Flock, HealthStatus } from '../../types/index.js';
import { useHealthQuery } from '../../lib/queries.js';
import { Database, Server, Terminal, RefreshCw, HardDrive, Trash2, Check } from 'lucide-react';
import { browserCache, getActiveFlockWithExpiry } from '../../lib/browser-cache.js';

interface OutletContextType {
  activeFlock: Flock | null;
  flocks: Flock[];
  refreshFlocks: () => void;
  health: HealthStatus | null;
}

export const SettingsPage: React.FC = () => {
  const { data: healthData, refetch, isFetching } = useHealthQuery();
  const context = useOutletContext<OutletContextType>();
  const health = healthData || context.health;
  const [cacheFeedback, setCacheFeedback] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState(() => browserCache.getDiagnostics());

  const isDbConnected = health?.connections.database.connected;
  const isRedisConnected = health?.connections.redis.connected;
  const activeFlockMeta = getActiveFlockWithExpiry();

  const handleClearCache = () => {
    browserCache.clearAll();
    setCacheStats(browserCache.getDiagnostics());
    setCacheFeedback('Browser cache cleared successfully. All 3-day cached entries purged.');
    setTimeout(() => setCacheFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="panel p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-base font-bold uppercase tracking-wider">
          System Infrastructure & Database Status
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          Monitor database client and Redis cache connections configured for this system.
        </p>
      </div>

      {/* In-Page Cache Feedback Banner */}
      {cacheFeedback && (
        <div className="p-3 border border-black bg-zinc-100 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 text-black" />
          <span>[BROWSER CACHE] {cacheFeedback}</span>
        </div>
      )}

      {/* Infrastructure Connection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Database Client Status Card */}
        <div className="panel p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-black shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-wider">PostgreSQL Database Client</h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 uppercase font-bold border shrink-0 ${
                  isDbConnected
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-zinc-700 border-zinc-400'
                }`}
              >
                {isDbConnected ? 'CONNECTED' : 'FALLBACK ACTIVE'}
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">ORM Driver</span>
                <span className="font-semibold">Drizzle ORM (postgres.js driver)</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Schemas Defined</span>
                <span className="font-semibold">12 Tables (Section 8 compliant)</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Status Details</span>
                <span className="text-zinc-700 break-words">
                  {isDbConnected
                    ? 'Live connection active to PostgreSQL instance.'
                    : `PostgreSQL is not reachable yet (${health?.connections.database.error || 'Connection refused'}). The backend is safely serving demo/mock operational data in memory.`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-zinc-200">
            <span className="text-[10px] font-mono uppercase text-zinc-400 break-all">
              Configured in backend/.env: DATABASE_URL
            </span>
          </div>
        </div>

        {/* Redis Cache Status Card */}
        <div className="panel p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-black shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Redis Cache Client</h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 uppercase font-bold border shrink-0 ${
                  isRedisConnected
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-zinc-700 border-zinc-400'
                }`}
              >
                {isRedisConnected ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Client Driver</span>
                <span className="font-semibold">{health?.connections.redis.client || 'Upstash Redis'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Cache Purpose</span>
                <span className="font-semibold">Dashboard KPIs & Flock Operational Computations</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Status Details</span>
                <span className="text-zinc-700 break-words">
                  {isRedisConnected
                    ? `Live connection active to ${health?.connections.redis.client || 'Redis'}.`
                    : `Redis cache is offline (${health?.connections.redis.error || 'Connection refused'}). Queries bypass cache without disruption.`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-zinc-200">
            <span className="text-[10px] font-mono uppercase text-zinc-400 break-all">
              Configured in backend/.env: UPSTASH_REDIS_REST_URL
            </span>
          </div>
        </div>

        {/* Browser Client Storage Card (3-Day TTL) */}
        <div className="panel p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-black shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Browser Client Storage</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 uppercase font-bold border shrink-0 bg-black text-white border-black">
                VALID 3 DAYS
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Storage Engine</span>
                <span className="font-semibold">HTML5 localStorage (TTL: 72 hours)</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Cached Active Flock</span>
                <span className="font-semibold text-black break-words">
                  {activeFlockMeta?.flock
                    ? `[${activeFlockMeta.flock.flockCode || 'FLOCK'}] ${activeFlockMeta.flock.name || activeFlockMeta.flock.id} (${activeFlockMeta.remainingHours}h remaining)`
                    : 'No flock session stored'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Cached Farm Data</span>
                <span className="text-zinc-700">
                  {cacheStats.totalEntries} entries ({(cacheStats.totalSizeBytes / 1024).toFixed(1)} KB) • Flocks, KPIs & Drafts
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Retention Policy</span>
                <span className="text-zinc-700">
                  Auto-opens last active flock when app is reopened within 3 days. Purges if older.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-zinc-200 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-zinc-400">
              Offline-ready cache
            </span>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase border border-zinc-400 px-2.5 py-1 hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5"
              title="Purge browser cache entries"
            >
              <Trash2 className="w-3 h-3 text-zinc-600" />
              <span>Purge Cache</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guide: How to connect your database and Redis */}
      <div className="panel p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="flex items-center gap-2 border-b border-black pb-2">
          <Terminal className="w-4 h-4 text-black shrink-0" />
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Connecting Database & Redis When Ready
          </h2>
        </div>

        <p className="text-xs font-mono text-zinc-600">
          When you are ready to provision your database and Redis instance, follow these simple steps:
        </p>

        <div className="space-y-3 text-xs font-mono">
          <div className="border border-zinc-300 p-3 bg-zinc-50 space-y-1">
            <div className="font-bold text-black">Option A: Launch via provided Docker Compose</div>
            <p className="text-zinc-600 text-[11px]">
              A preconfigured Docker Compose file is provided at the repository root:
            </p>
            <pre className="bg-black text-white p-2 text-[11px] overflow-x-auto">
              docker compose up -d
            </pre>
          </div>

          <div className="border border-zinc-300 p-3 bg-zinc-50 space-y-1">
            <div className="font-bold text-black">Option B: Use your existing PostgreSQL & Redis URLs</div>
            <p className="text-zinc-600 text-[11px]">
              Update the connection strings in <span className="font-bold">backend/.env</span>:
            </p>
            <pre className="bg-black text-white p-2 text-[11px] overflow-x-auto">
{`DATABASE_URL=postgresql://user:password@hostname:5432/farm_management
REDIS_URL=redis://localhost:6379`}
            </pre>
          </div>

          <div className="border border-zinc-300 p-3 bg-zinc-50 space-y-1">
            <div className="font-bold text-black">Run Migrations and Seed Demo Flocks</div>
            <p className="text-zinc-600 text-[11px]">
              Run Drizzle kit to generate and push schemas to PostgreSQL:
            </p>
            <pre className="bg-black text-white p-2 text-[11px] overflow-x-auto">
{`# In backend/ directory
npm run db:generate
npm run db:migrate
npm run db:seed`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
