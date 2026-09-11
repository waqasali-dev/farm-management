import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Layers, 
  FileSpreadsheet, 
  Settings,
  ShieldAlert,
  X
} from 'lucide-react';
import { Flock } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  activeFlock: Flock | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeFlock, isOpen = false, onClose }) => {
  const flockId = activeFlock?.id || '';
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isLinkActive = (to: string, label: string): boolean => {
    if (label === 'Dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    if (label === 'Flocks Management') {
      return location.pathname === '/flocks';
    }
    if (label === 'Daily Record') {
      return location.pathname.endsWith('/daily');
    }
    if (label === 'Reports & Audits') {
      return location.pathname.endsWith('/reports');
    }
    if (label === 'System & Infra') {
      return location.pathname === '/settings';
    }
    if (label === 'Admin Panel') {
      return location.pathname === '/admin';
    }
    return false;
  };

  const links = [
    {
      label: 'Dashboard',
      to: flockId ? `/dashboard?flock=${flockId}` : '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Daily Record',
      to: flockId ? `/flocks/${flockId}/daily` : '/flocks',
      icon: CalendarDays,
      disabled: !flockId,
    },
    {
      label: 'Flocks Management',
      to: '/flocks',
      icon: Layers,
    },
    {
      label: 'Reports & Audits',
      to: flockId ? `/flocks/${flockId}/reports` : '/flocks',
      icon: FileSpreadsheet,
      disabled: !flockId,
    },
    {
      label: 'System & Infra',
      to: '/settings',
      icon: Settings,
    },
    ...(user?.role === 'admin'
      ? [
          {
            label: 'Admin Panel',
            to: '/admin',
            icon: ShieldAlert,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 md:hidden animate-in fade-in duration-150"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Slide-Over Drawer */}
      <aside
        className={`
          bg-white border-r-2 border-black flex flex-col justify-between shrink-0 select-none
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-[6px_0px_0px_0px_rgba(0,0,0,1)]
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:w-64 md:border-r md:border-black md:shadow-none md:z-0 md:h-full md:flex
        `}
      >
        <div className="py-4 overflow-y-auto flex-1">
          {/* Operations Menu Header with Mobile Close X */}
          <div className="px-5 mb-4 flex items-center justify-between">
            <p className="text-[10px] tracking-widest uppercase font-semibold text-zinc-500">
              Operations Menu
            </p>
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 border border-black hover:bg-zinc-100 text-black transition-colors"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1.5 px-3">
            {links.map((link) => {
              const Icon = link.icon;
              if (link.disabled) {
                return (
                  <div
                    key={link.label}
                    className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-zinc-400 cursor-not-allowed"
                    title="Select a flock first"
                  >
                    <Icon className="w-4 h-4 text-zinc-400" />
                    <span>{link.label}</span>
                  </div>
                );
              }

              const active = isLinkActive(link.to, link.label);

              return (
                <NavLink
                  key={link.label}
                  to={link.to}
                  onClick={() => onClose?.()}
                  className={
                    `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-150 border ${
                      active
                        ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'text-black border-transparent hover:bg-zinc-100 hover:border-zinc-300'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {activeFlock && (
          <div className="p-3.5 border-t border-black bg-zinc-50 m-3 border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-mono font-bold text-black uppercase">{activeFlock.flockCode}</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-mono uppercase font-bold border ${
                activeFlock.status === 'active' ? 'bg-black text-white border-black' : 'bg-white text-zinc-700 border-zinc-400'
              }`}>
                {activeFlock.status}
              </span>
            </div>
            <p className="text-xs font-medium truncate text-zinc-800" title={activeFlock.name}>
              {activeFlock.name}
            </p>
            <div className="mt-2 text-[10px] font-mono text-zinc-500 flex justify-between">
              <span>Started: {activeFlock.startDate}</span>
              <span>{activeFlock.initialBirds.toLocaleString()} birds</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
