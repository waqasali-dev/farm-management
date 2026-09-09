import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Flock, HealthStatus } from '../../types/index.js';
import { useFlocksQuery, useCloseFlockMutation, useDeleteFlockMutation } from '../../lib/queries.js';
import { Plus, Layers, Lock, Check, AlertCircle, Trash2, AlertTriangle } from 'lucide-react';
import { CreateFlockModal } from './CreateFlockModal.js';
import { ConfirmModal } from '../../components/ui/ConfirmModal.js';

interface OutletContextType {
  activeFlock: Flock | null;
  flocks: Flock[];
  refreshFlocks: () => void;
  health: HealthStatus | null;
}

export const FlocksPage: React.FC = () => {
  const { activeFlock, refreshFlocks } = useOutletContext<OutletContextType>();
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [flockToClose, setFlockToClose] = useState<Flock | null>(null);
  const [flockToDelete, setFlockToDelete] = useState<Flock | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const navigate = useNavigate();

  // TanStack Query for Flocks List
  const { data: flocks = [], isLoading } = useFlocksQuery(filter === 'all' ? undefined : filter);
  const closeFlockMutation = useCloseFlockMutation();
  const deleteFlockMutation = useDeleteFlockMutation();

  const handleConfirmCloseFlock = async () => {
    if (!flockToClose) return;
    try {
      await closeFlockMutation.mutateAsync(flockToClose.id);
      refreshFlocks?.();
      setFeedback({
        type: 'success',
        message: `Flock [${flockToClose.flockCode}] ${flockToClose.name} has been closed and marked read-only.`,
      });
      setFlockToClose(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to close flock.',
      });
      setFlockToClose(null);
    }
  };

  const handleConfirmDeleteFlock = async () => {
    if (!flockToDelete) return;
    if (deleteConfirmText.trim().toLowerCase() !== 'delete') return;

    try {
      await deleteFlockMutation.mutateAsync(flockToDelete.id);
      
      const savedFlockId = localStorage.getItem('active_flock_id');
      if (savedFlockId === flockToDelete.id) {
        localStorage.removeItem('active_flock_id');
      }

      refreshFlocks?.();
      setFeedback({
        type: 'success',
        message: `Flock [${flockToDelete.flockCode}] ${flockToDelete.name} and all associated historical records were permanently deleted.`,
      });
      setFlockToDelete(null);
      setDeleteConfirmText('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete flock.',
      });
      setFlockToDelete(null);
      setDeleteConfirmText('');
    }
  };

  const handleSetActive = (flock: Flock) => {
    localStorage.setItem('active_flock_id', flock.id);
    navigate(`/dashboard?flock=${flock.id}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="panel p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-black shrink-0" />
            <h1 className="text-base font-bold uppercase tracking-wider">
              Flock Management & History
            </h1>
          </div>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Strict operational universe per batch. Flocks isolate mortality, feed, eggs, and diesel records.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
          {/* Status Filter Tabs */}
          <div className="border border-black p-0.5 flex bg-zinc-100 text-xs font-mono">
            {(['active', 'closed', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2.5 sm:px-3 py-1 uppercase font-semibold transition-all text-xs ${
                  filter === s ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-black text-white px-3 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap active:translate-x-0.5 active:translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Flock</span>
          </button>
        </div>
      </div>

      {/* In-Page Alerts / Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 border border-black text-xs font-mono flex items-center justify-between ${
            feedback.type === 'success' ? 'bg-zinc-100 text-black' : 'bg-zinc-100 text-black border-2'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-black" />
            ) : (
              <AlertCircle className="w-4 h-4 text-black" />
            )}
            <span>[{feedback.type.toUpperCase()}] {feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-black">
            ✕
          </button>
        </div>
      )}

      {/* Mobile Card List View (Phones & Small Tablets) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="panel p-8 text-center text-xs font-mono text-zinc-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Loading flocks from database...
          </div>
        ) : flocks.length === 0 ? (
          <div className="panel p-8 text-center text-xs font-mono text-zinc-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            No flocks found matching current filter.
          </div>
        ) : (
          flocks.map((flock) => {
            const isCurrent = activeFlock?.id === flock.id;

            return (
              <div
                key={flock.id}
                className={`panel p-4 space-y-3 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${
                  isCurrent ? 'bg-zinc-50' : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5">
                        {flock.flockCode}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono bg-black text-white px-1.5 py-0.5 uppercase font-bold">
                          Active In Session
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold border ${
                          flock.status === 'active'
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-zinc-600 border-zinc-400'
                        }`}
                      >
                        {flock.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-black mt-1.5 font-sans">
                      {flock.name}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-100 p-2.5 border border-zinc-300">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Start Date</span>
                    <span className="font-semibold text-zinc-800">{flock.startDate}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Initial Birds</span>
                    <span className="font-semibold text-black font-tabular">
                      {flock.initialBirds.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Egg Tracking</span>
                    <span className="font-semibold">
                      {flock.eggTrackingEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Status</span>
                    <span className="font-semibold uppercase">{flock.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleSetActive(flock)}
                      className="flex-1 min-w-[70px] py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-white hover:bg-black hover:text-white transition-colors text-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Select
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/flocks/${flock.id}/daily`)}
                    className="flex-1 min-w-[90px] py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-black text-white hover:bg-zinc-800 transition-colors text-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Daily Log
                  </button>
                  {flock.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => setFlockToClose(flock)}
                      disabled={closeFlockMutation.isPending}
                      className="py-2 px-3 text-xs font-mono font-bold uppercase border border-zinc-400 text-zinc-700 bg-white hover:bg-zinc-100 disabled:opacity-50"
                      title="Close flock and mark read-only"
                    >
                      Close
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFlockToDelete(flock);
                      setDeleteConfirmText('');
                    }}
                    disabled={deleteFlockMutation.isPending}
                    className="py-2 px-3 text-xs font-mono font-bold uppercase border border-red-500 text-red-600 bg-white hover:bg-red-50 disabled:opacity-50 flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(220,38,38,0.3)]"
                    title="Permanently delete flock"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Flocks Table (Desktop View) */}
      <div className="hidden md:block panel overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
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
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono">
                    Loading flocks from database...
                  </td>
                </tr>
              ) : flocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono">
                    No flocks found matching current filter.
                  </td>
                </tr>
              ) : (
                flocks.map((flock) => {
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
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
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
                            onClick={() => setFlockToClose(flock)}
                            disabled={closeFlockMutation.isPending}
                            className="border border-zinc-400 text-zinc-700 px-2 py-1 text-[11px] uppercase hover:bg-zinc-200 disabled:opacity-50"
                            title="Close flock and mark read-only"
                          >
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setFlockToDelete(flock);
                            setDeleteConfirmText('');
                          }}
                          disabled={deleteFlockMutation.isPending}
                          className="border border-red-500 text-red-600 px-2.5 py-1 text-[11px] uppercase hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1 font-semibold"
                          title="Permanently delete flock completely"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
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
        onCreated={() => {}}
      />

      {/* Close Flock Confirmation Overlay */}
      <ConfirmModal
        isOpen={!!flockToClose}
        title="Close Flock & Mark Read-Only"
        icon={<Lock className="w-4 h-4 text-white" />}
        message={
          flockToClose
            ? `Are you sure you want to CLOSE flock [${flockToClose.flockCode}] ${flockToClose.name}?\n\nClosed flocks are permanently read-only by default to preserve historical audit data. Daily operational records cannot be committed to closed flocks.`
            : ''
        }
        confirmLabel="Confirm Close Flock"
        cancelLabel="Cancel"
        isLoading={closeFlockMutation.isPending}
        onConfirm={handleConfirmCloseFlock}
        onCancel={() => setFlockToClose(null)}
      />

      {/* Delete Flock Strong Warning & Typed Confirmation Modal */}
      {flockToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border-2 border-red-600 w-full max-w-lg shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] p-5 sm:p-6 space-y-5">
            {/* Warning Header */}
            <div className="flex items-start gap-3 border-b-2 border-red-600 pb-3">
              <div className="w-10 h-10 bg-red-600 text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-600">
                  CRITICAL ACTION: PERMANENT FLOCK DELETION
                </h3>
                <p className="text-xs font-mono text-black font-semibold mt-0.5">
                  [{flockToDelete.flockCode}] {flockToDelete.name} ({flockToDelete.status.toUpperCase()})
                </p>
              </div>
            </div>

            {/* Warning Details */}
            <div className="bg-red-50 border border-red-300 p-3.5 space-y-2 text-xs font-mono text-red-950">
              <p className="font-bold uppercase text-red-700">
                ⚠️ Warning: This operation CANNOT be undone!
              </p>
              <p className="text-[11px] leading-relaxed">
                Deleting this flock will permanently erase it and purge ALL corresponding historical data from the database, including:
              </p>
              <ul className="text-[10px] list-disc list-inside space-y-0.5 text-zinc-700 pl-1">
                <li>Daily mortality records, moat cumulative counts & weather logs</li>
                <li>All feed arrivals, consumption, and return tracking records</li>
                <li>All calcium chips bags received, used, and returned logs</li>
                <li>All plastic and cardboard tray inventory & wastage records</li>
                <li>Egg production, sales, conveyor/mess usage & waste logs</li>
                <li>Diesel fuel arrivals and consumption history</li>
                <li>Bird weighings, uniformity, water, medicines & vaccination history</li>
              </ul>
            </div>

            {/* Typed Confirmation Box */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold uppercase text-black">
                To confirm deletion, type <span className="text-red-600 bg-zinc-100 px-1.5 py-0.5 border border-red-300">delete</span> in the field below:
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type 'delete' to confirm"
                className="w-full border-2 border-black px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <span className="text-[10px] font-mono text-zinc-500 block">
                The delete button will remain disabled until you type "delete".
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  setFlockToDelete(null);
                  setDeleteConfirmText('');
                }}
                disabled={deleteFlockMutation.isPending}
                className="px-4 py-2 border border-black bg-white hover:bg-zinc-100 text-xs font-mono uppercase font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteFlock}
                disabled={
                  deleteConfirmText.trim().toLowerCase() !== 'delete' ||
                  deleteFlockMutation.isPending
                }
                className="px-5 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono uppercase font-bold tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {deleteFlockMutation.isPending
                    ? 'Deleting Flock...'
                    : 'Permanently Delete Flock'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
