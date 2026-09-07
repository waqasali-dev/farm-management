import React from 'react';
import { Flock, HealthStatus } from '../../types/index.js';
import { Layers, Database, Server, Plus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  flocks: Flock[];
  activeFlock: Flock | null;
  onSelectFlock: (flock: Flock) => void;
  health?: HealthStatus | null;
  onOpenCreateModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  flocks,
  activeFlock,
  onSelectFlock,
  health,
  onOpenCreateModal,
}) => {
  const navigate = useNavigate();

  const handleFlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = flocks.find((f) => f.id === e.target.value);
    if (selected) {
      onSelectFlock(selected);
      navigate(`/dashboard?flock=${selected.id}`);
    }
  };

  const isDbConnected = health?.connections.database.connected;
  const isRedisConnected = health?.connections.redis.connected;

  return (
    <header className="h-16 border-b border-black bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Farm Title */}
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-mono font-bold text-sm tracking-tighter">
          FD
        </div>
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-black">
            Farm Data Management
          </h1>
          <p className="text-[10px] font-mono uppercase text-zinc-500">
            Isolated Flock Operations Control
          </p>
        </div>
      </div>

      {/* Global Flock Selector & Infrastructure Badges */}
      <div className="flex items-center gap-4">
        {/* Connection Status Pills */}
        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono">
          {/* PostgreSQL Client Status */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 border ${
              isDbConnected
                ? 'border-black bg-black text-white'
                : 'border-zinc-400 bg-zinc-100 text-zinc-700'
            }`}
            title={
              isDbConnected
                ? 'PostgreSQL database connected via Drizzle ORM'
                : `PostgreSQL offline: ${health?.connections.database.error || 'Fallback in-memory storage active'}`
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span>DB: {isDbConnected ? 'ONLINE' : 'FALLBACK'}</span>
          </div>

          {/* Redis Client Status */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 border ${
              isRedisConnected
                ? 'border-black bg-black text-white'
                : 'border-zinc-400 bg-zinc-100 text-zinc-700'
            }`}
            title={
              isRedisConnected
                ? 'Redis cache connected via ioredis'
                : `Redis offline: ${health?.connections.redis.error || 'Running without cache'}`
            }
          >
            <Server className="w-3.5 h-3.5" />
            <span>REDIS: {isRedisConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-300 hidden md:block" />

        {/* Flock Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="flock-select" className="text-[11px] font-mono uppercase text-zinc-500 font-semibold hidden sm:inline">
            Active Flock:
          </label>
          <div className="relative">
            <select
              id="flock-select"
              value={activeFlock?.id || ''}
              onChange={handleFlockChange}
              className="appearance-none bg-white border border-black px-3 py-1.5 pr-8 text-xs font-mono font-bold uppercase tracking-wider text-black focus:outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {flocks.length === 0 ? (
                <option value="">No Flocks Available</option>
              ) : (
                flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.flockCode}] {f.name} ({f.status.toUpperCase()})
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-black" />
          </div>
        </div>

        {/* Quick Create Flock Action */}
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 bg-black text-white border border-black px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Flock</span>
        </button>
      </div>
    </header>
  );
};
