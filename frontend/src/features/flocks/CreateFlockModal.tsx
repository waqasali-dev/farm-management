import React, { useState } from 'react';
import { useCreateFlockMutation } from '../../lib/queries.js';
import { Flock } from '../../types/index.js';
import { X } from 'lucide-react';

interface CreateFlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (flock: Flock) => void;
}

export const CreateFlockModal: React.FC<CreateFlockModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialBirds, setInitialBirds] = useState<number | ''>(10000);
  const [eggTrackingEnabled, setEggTrackingEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFlockMutation = useCreateFlockMutation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Flock name is required');
      return;
    }
    if (!initialBirds || initialBirds <= 0) {
      setError('Initial bird count must be greater than zero');
      return;
    }

    try {
      setError(null);
      const newFlock = await createFlockMutation.mutateAsync({
        name: name.trim(),
        startDate,
        initialBirds: Number(initialBirds),
        eggTrackingEnabled,
      });

      onCreated(newFlock);
      onClose();
      // Reset
      setName('');
      setInitialBirds(10000);
      setEggTrackingEnabled(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create flock');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border-2 border-black w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Modal Header */}
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Create New Flock</h2>
            <p className="text-[10px] text-zinc-400 font-mono">Isolated Lifecycle Operational Unit</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-zinc-300 p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-zinc-100 border border-black text-black text-xs font-mono">
              [ERROR] {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-black">
              Flock Name / Designation *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Broiler Batch 2026-C or Layer High Yield Alpha"
              className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-black">
                Start Date (Day 0) *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-black">
                Initial Birds Count *
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={initialBirds}
                onChange={(e) => setInitialBirds(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Egg Tracking Toggle */}
          <div className="border border-black p-3 bg-zinc-50 flex items-start gap-3">
            <input
              id="egg-tracking-checkbox"
              type="checkbox"
              checked={eggTrackingEnabled}
              onChange={(e) => setEggTrackingEnabled(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-black border-black cursor-pointer"
            />
            <label htmlFor="egg-tracking-checkbox" className="text-xs cursor-pointer select-none">
              <span className="font-bold uppercase tracking-wide block text-black">
                Enable Egg Production Tracking
              </span>
              <span className="text-zinc-600 block text-[11px] mt-0.5">
                Check this box for layer flocks requiring daily production, packaging (peti/trays), sales, and waste tracking.
              </span>
            </label>
          </div>

          <div className="p-3 bg-zinc-100 border border-zinc-300 text-[11px] font-mono text-zinc-600">
            ℹ️ Flock code will be automatically assigned (e.g. FL-004) and stored in PostgreSQL.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-black hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createFlockMutation.isPending}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-black text-white border border-black hover:bg-zinc-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              {createFlockMutation.isPending ? 'Creating...' : 'Create Flock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
