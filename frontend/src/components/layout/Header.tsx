import React from 'react';
import { Flock, HealthStatus } from '../../types/index.js';
import { Layers, Database, Server, Plus, ChevronDown, Menu, User, LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

interface HeaderProps {
  flocks: Flock[];
  activeFlock: Flock | null;
  onSelectFlock: (flock: Flock) => void;
  health?: HealthStatus | null;
  onOpenCreateModal: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  flocks,
  activeFlock,
  onSelectFlock,
  health,
  onOpenCreateModal,
  onToggleMobileMenu,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleFlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = flocks.find((f) => f.id === e.target.value);
    if (selected) {
      onSelectFlock(selected);
      navigate(`/dashboard?flock=${selected.id}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isDbConnected = health?.connections.database.connected;
  const isRedisConnected = health?.connections.redis.connected;

  return (
    <header className="h-16 border-b border-black bg-white px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Brand, Hamburger & Farm Title */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 border border-black bg-white hover:bg-zinc-100 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-mono font-bold text-sm tracking-tighter shrink-0">
          FD
        </div>
        <div className="hidden sm:block">
          <h1 className="text-sm font-bold uppercase tracking-wider text-black truncate max-w-[180px] md:max-w-none">
            Farm Data Management
          </h1>
          <p className="text-[10px] font-mono uppercase text-zinc-500">
            Isolated Operations Control
          </p>
        </div>
      </div>

      {/* Global Flock Selector & Infrastructure Badges */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connection Status Pills (Hidden on Mobile) */}
        <div className="hidden 2xl:flex items-center gap-2 text-[11px] font-mono">
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
                ? `Redis cache connected via ${health?.connections.redis.client || 'Upstash Redis'}`
                : `Redis offline: ${health?.connections.redis.error || 'Running without cache'}`
            }
          >
            <Server className="w-3.5 h-3.5" />
            <span>REDIS: {isRedisConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>

        {/* Flock Selector Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <label htmlFor="flock-select" className="text-[11px] font-mono uppercase text-zinc-500 font-semibold hidden xl:inline">
            Flock:
          </label>
          <div className="relative max-w-[120px] xs:max-w-[150px] sm:max-w-xs">
            <select
              id="flock-select"
              value={activeFlock?.id || ''}
              onChange={handleFlockChange}
              className="appearance-none bg-white border border-black px-2.5 sm:px-3 py-1.5 pr-7 sm:pr-8 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-black focus:outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] truncate w-full"
            >
              {flocks.length === 0 ? (
                <option value="">No Flocks</option>
              ) : (
                flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.flockCode}] {f.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-black" />
          </div>
        </div>

        {/* Quick Create Flock Action */}
        <button
          onClick={onOpenCreateModal}
          className="hidden sm:flex items-center gap-1.5 bg-black text-white border border-black px-2.5 sm:px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)] shrink-0"
          title="Create New Flock"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Flock</span>
        </button>

        <div className="h-6 w-px bg-zinc-300 hidden sm:block" />

        {/* User Badge & Actions */}
        {user ? (
          <div className="flex items-center gap-2">
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="hidden md:flex items-center gap-1.5 border border-black bg-white hover:bg-zinc-100 px-2.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all text-black"
                title="Open Admin Control Panel"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </Link>
            )}

            <div className="hidden lg:flex flex-col items-end text-right">
              <span className="text-xs font-mono font-bold text-black max-w-[140px] truncate" title={user.email}>
                {user.email}
              </span>
              <span className={`text-[9px] font-mono uppercase font-bold tracking-wider px-1 border ${
                user.role === 'admin' ? 'bg-black text-white border-black' : 'bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}>
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 sm:px-2 sm:py-1.5 border border-black bg-white hover:bg-black hover:text-white text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="border border-black bg-black text-white px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider hover:bg-zinc-800"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
};
