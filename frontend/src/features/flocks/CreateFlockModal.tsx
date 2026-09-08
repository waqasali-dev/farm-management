import React, { useState, useMemo } from 'react';
import { useCreateFlockMutation } from '../../lib/queries.js';
import { Flock } from '../../types/index.js';
import { calculateBirdAge, calculateRemainingBirds } from '../../lib/calculations.js';
import { X, Layers, AlertCircle, Calculator } from 'lucide-react';

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
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Mode: fresh placement vs onboarding already running flock
  const [mode, setMode] = useState<'fresh' | 'running'>('fresh');

  // Common Fields
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [initialBirds, setInitialBirds] = useState<number | ''>(10000);
  const [eggTrackingEnabled, setEggTrackingEnabled] = useState(false);

  // Running Flock Opening Balances
  const [cumulativeMortality, setCumulativeMortality] = useState<number | ''>(0);
  const [totalReceivedFeedBags, setTotalReceivedFeedBags] = useState<number | ''>(0);
  const [remainingFeedBags, setRemainingFeedBags] = useState<number | ''>(0);
  const [remainingEggPeti, setRemainingEggPeti] = useState<number | ''>(0);
  const [remainingEggTrays, setRemainingEggTrays] = useState<number | ''>(0);
  const [remainingDieselLiters, setRemainingDieselLiters] = useState<number | ''>(0);
  const [asOfDate, setAsOfDate] = useState(yesterdayStr);

  const [error, setError] = useState<string | null>(null);

  const createFlockMutation = useCreateFlockMutation();

  // Real-time calculated age for running flock
  const birdAge = useMemo(() => {
    try {
      return calculateBirdAge(todayStr, startDate);
    } catch {
      return { week: 0, day: 0, totalDays: 0, formatted: 'W0-D00' };
    }
  }, [todayStr, startDate]);

  // Real-time calculated remaining birds
  const calculatedLivingBirds = useMemo(() => {
    const init = Number(initialBirds) || 0;
    const mort = Number(cumulativeMortality) || 0;
    return calculateRemainingBirds(init, mort);
  }, [initialBirds, cumulativeMortality]);

  // Total opening eggs
  const totalOpeningEggs = useMemo(() => {
    const peti = Number(remainingEggPeti) || 0;
    const trays = Number(remainingEggTrays) || 0;
    return peti * 360 + trays * 30;
  }, [remainingEggPeti, remainingEggTrays]);

  if (!isOpen) return null;

  const handleModeChange = (newMode: 'fresh' | 'running') => {
    setMode(newMode);
    setError(null);
    if (newMode === 'running') {
      if (startDate === todayStr) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 28);
        setStartDate(pastDate.toISOString().split('T')[0]);
      }
      setAsOfDate(yesterdayStr);
    } else {
      setStartDate(todayStr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Flock name is required');
      return;
    }

    const numInitial = Number(initialBirds);
    if (!numInitial || numInitial <= 0) {
      setError('Initial bird count must be greater than zero');
      return;
    }

    if (mode === 'running') {
      const numMortality = Number(cumulativeMortality) || 0;
      if (numMortality < 0) {
        setError('Cumulative mortality cannot be negative');
        return;
      }
      if (numMortality >= numInitial) {
        setError('Cumulative mortality (moat) cannot equal or exceed initial birds placed');
        return;
      }
      if (Number(remainingFeedBags) < 0) {
        setError('Remaining feed bags cannot be negative');
        return;
      }
      if (Number(totalReceivedFeedBags) < 0) {
        setError('Total received feed bags cannot be negative');
        return;
      }
      const numTotalReceived = Number(totalReceivedFeedBags) || 0;
      const numRemainingFeed = Number(remainingFeedBags) || 0;
      if (numTotalReceived > 0 && numRemainingFeed > numTotalReceived) {
        setError(`Already present remaining feed (${numRemainingFeed} bags) cannot exceed total received feed (${numTotalReceived} bags)`);
        return;
      }
      if (Number(remainingDieselLiters) < 0) {
        setError('Remaining diesel cannot be negative');
        return;
      }
      if (Number(remainingEggPeti) < 0 || Number(remainingEggTrays) < 0) {
        setError('Egg stock counts cannot be negative');
        return;
      }
    }

    try {
      const newFlock = await createFlockMutation.mutateAsync({
        name: name.trim(),
        startDate,
        initialBirds: numInitial,
        eggTrackingEnabled,
        isRunningFlock: mode === 'running',
        openingBalances: mode === 'running' ? {
          cumulativeMortality: Number(cumulativeMortality) || 0,
          totalReceivedFeedBags: Number(totalReceivedFeedBags) || 0,
          remainingFeedBags: Number(remainingFeedBags) || 0,
          remainingEggPeti: eggTrackingEnabled ? (Number(remainingEggPeti) || 0) : 0,
          remainingEggTrays: eggTrackingEnabled ? (Number(remainingEggTrays) || 0) : 0,
          remainingDieselLiters: Number(remainingDieselLiters) || 0,
          asOfDate: asOfDate || yesterdayStr,
        } : undefined,
      });

      onCreated(newFlock);
      onClose();
      // Reset form
      setName('');
      setStartDate(todayStr);
      setInitialBirds(10000);
      setEggTrackingEnabled(false);
      setCumulativeMortality(0);
      setTotalReceivedFeedBags(0);
      setRemainingFeedBags(0);
      setRemainingEggPeti(0);
      setRemainingEggTrays(0);
      setRemainingDieselLiters(0);
    } catch (err: any) {
      setError(err.message || 'Failed to create flock');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border-2 border-black w-full max-w-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-black text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-black shrink-0">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {mode === 'running' ? 'Onboard Already Running Flock' : 'Create New Flock'}
            </h2>
            <p className="text-[10px] text-zinc-400 font-mono">
              {mode === 'running'
                ? 'Mid-Cycle Baseline Setup • Captures Opening Inventory & Prior Mortality'
                : 'Day 0 Placement • Fresh Lifecycle Operational Unit'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-zinc-300 p-1 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="border-b border-black bg-zinc-100 p-2 flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleModeChange('fresh')}
            className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider border transition-all text-center ${
              mode === 'fresh'
                ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white text-zinc-600 border-zinc-300 hover:border-black'
            }`}
          >
            1. Fresh Flock (Day 0 Arrival)
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('running')}
            className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider border transition-all text-center ${
              mode === 'running'
                ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white text-zinc-600 border-zinc-300 hover:border-black'
            }`}
          >
            2. Already Running Flock (Mid-Cycle)
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-zinc-100 border border-black text-black text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>[ERROR] {error}</span>
            </div>
          )}

          {/* Flock Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-black">
              Flock Name / Designation *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'running' ? 'e.g. Existing Layer Batch Shed 2' : 'e.g. Broiler Batch 2026-C'}
              className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Start Date & Bird Age Calculation */}
          <div className="border border-black p-4 bg-zinc-50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-black">
                {mode === 'running' ? 'When Did This Flock Start? (Start Date) *' : 'Start Date (Day 0) *'}
              </label>
              {mode === 'running' && (
                <span className="text-[10px] font-mono font-bold uppercase bg-black text-white px-2 py-0.5">
                  Calculated Age: {birdAge.formatted}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <input
                  type="date"
                  required
                  value={startDate}
                  max={todayStr}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-black px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {mode === 'running' && (
                <div className="text-xs font-mono text-zinc-700 bg-white border border-zinc-300 p-2.5">
                  <div className="font-bold uppercase text-[11px] text-black">
                    Present Week & Day
                  </div>
                  <div className="mt-0.5">
                    Week <span className="font-bold">{birdAge.week}</span>, Day{' '}
                    <span className="font-bold">{birdAge.day}</span> ({birdAge.totalDays} calendar days elapsed)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bird Placements & Mortality Calculation */}
          <div className="border border-black p-4 bg-zinc-50 space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-300 pb-2">
              <Calculator className="w-4 h-4 text-black" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                Bird Counts & Population Math
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-black">
                  Total Initial Birds Placed *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={initialBirds}
                  onChange={(e) => setInitialBirds(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-full border border-black px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="e.g. 50000"
                />
              </div>

              {mode === 'running' ? (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-black">
                    Total Moat / Mortality to Date *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={cumulativeMortality}
                    onChange={(e) => setCumulativeMortality(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="w-full border border-black px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g. 1200"
                  />
                </div>
              ) : (
                <div className="text-xs font-mono text-zinc-500 flex items-center p-2">
                  Fresh flock starting with 0 past mortality.
                </div>
              )}
            </div>

            {/* Live Remaining Birds Result Banner */}
            {mode === 'running' && (
              <div className="p-3 bg-black text-white border border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                    Computed Living Birds Remaining
                  </span>
                  <span className="text-sm font-mono font-bold">
                    {calculatedLivingBirds.toLocaleString()} Birds Alive
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-zinc-300">
                  {Number(initialBirds || 0).toLocaleString()} initial −{' '}
                  {Number(cumulativeMortality || 0).toLocaleString()} moat
                  {Number(initialBirds) > 0 && (
                    <div className="text-[10px] text-zinc-400">
                      Mortality to date:{' '}
                      {(((Number(cumulativeMortality) || 0) / Number(initialBirds)) * 100).toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Egg Production Tracking Toggle */}
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
                Check this box for layer flocks requiring daily production, packaging (peti/trays), sales, and egg stock audit.
              </span>
            </label>
          </div>

          {/* Running Flock Opening Inventories */}
          {mode === 'running' && (
            <div className="border border-black p-4 bg-zinc-50 space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-300 pb-2">
                <Layers className="w-4 h-4 text-black" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                  Already Present Opening Inventories
                </h3>
              </div>

              {/* Feed Inventory */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-black">
                    Total Received Feed (Bags) Till Now
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={totalReceivedFeedBags}
                      onChange={(e) => setTotalReceivedFeedBags(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="e.g. 500"
                    />
                    <span className="text-xs font-mono text-zinc-600 whitespace-nowrap">
                      = {(Number(totalReceivedFeedBags || 0) * 50).toLocaleString()} kg total
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    Cumulative bags delivered/purchased for this flock from start date up to cutover date.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-black">
                    Already Present Remaining Feed (Bags) *
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={remainingFeedBags}
                      onChange={(e) => setRemainingFeedBags(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="e.g. 100"
                    />
                    <span className="text-xs font-mono text-zinc-600 whitespace-nowrap">
                      = {(Number(remainingFeedBags || 0) * 50).toLocaleString()} kg in stock
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    Physical feed bags currently present in farm warehouse / shed storage.
                  </p>
                </div>

                {/* Live Computed Feed Balance Insight */}
                {(Number(totalReceivedFeedBags) > 0 || Number(remainingFeedBags) > 0) && (
                  <div className="p-2.5 bg-black text-white border border-black text-[11px] font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-zinc-300">
                      Computed Past Feed Consumed:
                    </span>
                    <span className="font-bold text-white">
                      {Math.max(
                        0,
                        ((Number(totalReceivedFeedBags) || 0) > 0 ? (Number(totalReceivedFeedBags) || 0) : (Number(remainingFeedBags) || 0)) -
                          (Number(remainingFeedBags) || 0)
                      ).toLocaleString()} Bags
                      {' '}({(Math.max(
                        0,
                        ((Number(totalReceivedFeedBags) || 0) > 0 ? (Number(totalReceivedFeedBags) || 0) : (Number(remainingFeedBags) || 0)) -
                          (Number(remainingFeedBags) || 0)
                      ) * 50).toLocaleString()} kg used prior)
                    </span>
                  </div>
                )}
              </div>

              {/* Egg Stock (if enabled) */}
              {eggTrackingEnabled && (
                <div className="border border-zinc-300 p-3 bg-white space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-black">
                    Remaining Egg Production in Storage (Petis & Trays)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block">Petis (360 eggs each)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={remainingEggPeti}
                        onChange={(e) => setRemainingEggPeti(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block">Trays (30 eggs each)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={remainingEggTrays}
                        onChange={(e) => setRemainingEggTrays(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-700 pt-1">
                    Total Starting Egg Stock: <span className="font-bold">{totalOpeningEggs.toLocaleString()}</span> eggs
                  </div>
                </div>
              )}

              {/* Diesel Inventory */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-black">
                  Already Present Remaining Diesel (Liters)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={remainingDieselLiters}
                    onChange={(e) => setRemainingDieselLiters(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full border border-black px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g. 500"
                  />
                  <span className="text-xs font-mono text-zinc-600 whitespace-nowrap">
                    Liters in tanks
                  </span>
                </div>
              </div>

              {/* Baseline Cutover Date */}
              <div className="border-t border-zinc-200 pt-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-black">
                  Baseline / Cutover Balance Date
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  max={todayStr}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full border border-black px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-[10px] font-mono text-zinc-500 mt-1">
                  Opening stock & past mortality will be locked on this date ({asOfDate}). Today ({todayStr}) will be your fresh Day 1 of operational logging.
                </p>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-zinc-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto text-center px-4 py-2.5 sm:py-2 text-xs font-semibold uppercase tracking-wider border border-black hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createFlockMutation.isPending}
              className="w-full sm:w-auto text-center px-6 py-2.5 sm:py-2 text-xs font-bold uppercase tracking-wider bg-black text-white border border-black hover:bg-zinc-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5"
            >
              {createFlockMutation.isPending
                ? 'Onboarding...'
                : mode === 'running'
                ? 'Onboard Running Flock'
                : 'Create Flock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
