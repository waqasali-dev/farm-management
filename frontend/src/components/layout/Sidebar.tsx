import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Layers, 
  FileSpreadsheet, 
  Settings,
  ShieldAlert
} from 'lucide-react';
import { Flock } from '../../types/index.js';

interface SidebarProps {
  activeFlock: Flock | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeFlock }) => {
  const flockId = activeFlock?.id || '';
  const location = useLocation();

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
  ];

  return (
    <aside className="w-64 bg-white border-r border-black flex flex-col justify-between shrink-0 select-none min-h-[calc(100vh-64px)]">
      <div className="py-4">
        <div className="px-5 mb-4">
          <p className="text-[10px] tracking-widest uppercase font-semibold text-zinc-500">
            Operations Menu
          </p>
        </div>

        <nav className="space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            if (link.disabled) {
              return (
                <div
                  key={link.label}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-zinc-400 cursor-not-allowed"
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
                className={
                  `flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-150 border ${
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
        <div className="p-4 border-t border-black bg-zinc-50 m-3 border">
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
  );
};
