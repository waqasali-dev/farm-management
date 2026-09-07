import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Flock, HealthStatus } from '../../types/index.js';
import { Database, Server, Terminal, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface OutletContextType {
  activeFlock: Flock | null;
  flocks: Flock[];
  refreshFlocks: () => void;
  health: HealthStatus | null;
}

export const SettingsPage: React.FC = () => {
  const { health } = useOutletContext<OutletContextType>();

  const isDbConnected = health?.connections.database.connected;
  const isRedisConnected = health?.connections.redis.connected;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="panel p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-base font-bold uppercase tracking-wider">
          System Infrastructure & Database Status
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          Monitor database client and Redis cache connections configured for this system.
        </p>
      </div>

      {/* Infrastructure Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Client Status Card */}
        <div className="panel p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-black" />
                <h2 className="text-xs font-bold uppercase tracking-wider">PostgreSQL Database Client</h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 uppercase font-bold border ${
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
                <span className="text-zinc-700">
                  {isDbConnected
                    ? 'Live connection active to PostgreSQL instance.'
                    : `PostgreSQL is not reachable yet (${health?.connections.database.error || 'Connection refused'}). The backend is safely serving demo/mock operational data in memory.`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-zinc-200">
            <span className="text-[10px] font-mono uppercase text-zinc-400">
              Configured in backend/.env: DATABASE_URL
            </span>
          </div>
        </div>

        {/* Redis Cache Status Card */}
        <div className="panel p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-black" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Redis Cache Client</h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 uppercase font-bold border ${
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
                <span className="font-semibold">ioredis (resilient auto-reconnect)</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Cache Purpose</span>
                <span className="font-semibold">Dashboard KPIs & Flock Operational Computations</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Status Details</span>
                <span className="text-zinc-700">
                  {isRedisConnected
                    ? 'Live connection active to Redis instance.'
                    : `Redis cache is offline (${health?.connections.redis.error || 'Connection refused'}). Queries bypass cache without disruption.`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-zinc-200">
            <span className="text-[10px] font-mono uppercase text-zinc-400">
              Configured in backend/.env: REDIS_URL
            </span>
          </div>
        </div>
      </div>

      {/* Guide: How to connect your database and Redis */}
      <div className="panel p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="flex items-center gap-2 border-b border-black pb-2">
          <Terminal className="w-4 h-4 text-black" />
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
