import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Flock, HealthStatus } from '../../types/index.js';
import { api } from '../../lib/api-client.js';
import { Plus, CheckCircle, Lock, Calendar, Layers } from 'lucide-react';
import { CreateFlockModal } from './CreateFlockModal.js';

interface OutletContextType {
  activeFlock: Flock | null;
  flocks: Flock[];
  refreshFlocks: () => void;
  health: HealthStatus | null;
}

export const FlocksPage: React.FC = () => {
  const { activeFlock, flocks, refreshFlocks } = useOutletContext<OutletContextType>();
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const filteredFlocks = flocks.filter((f) => {
    if (filter === 'all') return true;
    return f.status === filter;
  });

  const handleCloseFlock = async (flock: Flock) => {
    if (
      window.confirm(
        `Are you sure you want to CLOSE flock [${flock.flockCode}] ${flock.name}?\nClosed flocks are permanently read-only by default to preserve historical audit data.`
      )
    ) {
      try {
        setClosingId(flock.id);
        await api.closeFlock(flock.id);
        await refreshFlocks();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      } finally {
        setClosingId(null);
      }
    }
  };

  const handleSetActive = (flock: Flock) => {
    localStorage.setItem('active_flock_id', flock.id);
    navigate(`/dashboard?flock=${flock.id}`);
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-black" />
            <h1 className="text-base font-bold uppercase tracking-wider">
              Flock Management & History
            </h1>
          </div>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Strict operational universe per batch. Flocks isolate mortality, feed, eggs, and diesel records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="border border-black p-0.5 flex bg-zinc-100 text-xs font-mono">
            {(['all', 'active', 'closed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 uppercase font-semibold transition-all ${
                  filter === s ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Flock</span>
          </button>
        </div>
      </div>

      {/* Flocks Table */}
      <div className="panel overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black bg-zinc-100 text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Flock Name</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Initial Birds</th>
                <th className="py-3 px-4">Egg Tracking</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs font-mono">
              {filteredFlocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono">
                    No flocks found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredFlocks.map((flock) => {
                  const isCurrent = activeFlock?.id === flock.id;

                  return (
                    <tr
                      key={flock.id}
                      className={`hover:bg-zinc-50 transition-colors ${
                        isCurrent ? 'bg-zinc-100/70 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-black flex items-center gap-2">
                        <span>{flock.flockCode}</span>
                        {isCurrent && (
                          <span className="text-[9px] bg-black text-white px-1.5 py-0.2 uppercase">
                            Active In Session
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-black">
                        {flock.name}
                      </td>
                      <td className="py-3 px-4 text-zinc-700">{flock.startDate}</td>
                      <td className="py-3 px-4 font-tabular">{flock.initialBirds.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {flock.eggTrackingEnabled ? (
                          <span className="border border-black px-1.5 py-0.5 text-[10px] uppercase font-bold bg-white text-black">
                            Enabled
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[10px] uppercase">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] uppercase font-bold border ${
                            flock.status === 'active'
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-zinc-600 border-zinc-400'
                          }`}
                        >
                          {flock.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {!isCurrent && (
                          <button
                            onClick={() => handleSetActive(flock)}
                            className="border border-black px-2.5 py-1 text-[11px] font-bold uppercase hover:bg-black hover:text-white transition-colors"
                          >
                            Select
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/flocks/${flock.id}/daily`)}
                          className="border border-black px-2.5 py-1 text-[11px] uppercase hover:bg-zinc-100"
                        >
                          Daily Records
                        </button>
                        {flock.status === 'active' && (
                          <button
                            onClick={() => handleCloseFlock(flock)}
                            disabled={closingId === flock.id}
                            className="border border-zinc-400 text-zinc-700 px-2 py-1 text-[11px] uppercase hover:bg-zinc-200"
                            title="Close flock and mark read-only"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateFlockModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => refreshFlocks()}
      />
    </div>
  );
};
