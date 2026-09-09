import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  useFlockQuery,
  useDailyRecordQuery,
  useMedicinesQuery,
  useSaveDailyRecordMutation,
  useUpdateFlockMutation,
} from '../../lib/queries.js';
import {
  petiTraysToEggs,
  eggsToPetiTrays,
  calculateProductionPercentage,
  calculateFeedPerBirdGrams,
  calculateWaterPerBirdMl,
  calculateBirdAge,
} from '../../lib/calculations.js';
import {
  Calendar,
  Save,
  Lock,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  Egg,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal.js';

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DailyRecordPage: React.FC = () => {
  const { flockId } = useParams<{ flockId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [date, setDate] = useState<string>(
    searchParams.get('date') || getLocalDateString()
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isEggConfirmOpen, setIsEggConfirmOpen] = useState(false);

  useEffect(() => {
    const urlDate = searchParams.get('date');
    if (urlDate && urlDate !== date) {
      setDate(urlDate);
    }
  }, [searchParams]);

  // TanStack Queries (Section 30, 31)
  const { data: flock, isLoading: isFlockLoading } = useFlockQuery(flockId);
  const { data: recordData, isLoading: isRecordLoading, isFetching: isRecordFetching, refetch } = useDailyRecordQuery(flockId, date);
  const { data: medicinesMaster = [] } = useMedicinesQuery();
  const saveMutation = useSaveDailyRecordMutation(flockId || '', date);
  const updateFlockMutation = useUpdateFlockMutation();

  // Daily Form State
  const [mortality, setMortality] = useState<number>(0);
  const [lightHours, setLightHours] = useState<number | ''>('');
  const [maxTemp, setMaxTemp] = useState<number | ''>('');
  const [minTemp, setMinTemp] = useState<number | ''>('');

  const [feedArrivalBags, setFeedArrivalBags] = useState<number>(0);
  const [feedUsedBags, setFeedUsedBags] = useState<number>(0);
  const [feedReturnedBags, setFeedReturnedBags] = useState<number>(0);

  const [chipsArrivalBags, setChipsArrivalBags] = useState<number>(0);
  const [chipsUsedBags, setChipsUsedBags] = useState<number>(0);
  const [chipsReturnedBags, setChipsReturnedBags] = useState<number>(0);

  const [plasticReceived, setPlasticReceived] = useState<number>(0);
  const [plasticUsed, setPlasticUsed] = useState<number>(0);
  const [cardboardReceived, setCardboardReceived] = useState<number>(0);
  const [cardboardUsed, setCardboardUsed] = useState<number>(0);
  const [cardboardWasted, setCardboardWasted] = useState<number>(0);

  const [prodPeti, setProdPeti] = useState<number>(0);
  const [prodTrays, setProdTrays] = useState<number>(0);
  const [soldPeti, setSoldPeti] = useState<number>(0);
  const [soldTrays, setSoldTrays] = useState<number>(0);

  const [eggUsage, setEggUsage] = useState<
    { id?: string; type: 'gift-use' | 'conveyor-waste' | 'mess-use' | 'store-waste'; peti: number; trays: number }[]
  >([]);

  const [dieselArrival, setDieselArrival] = useState<number>(0);
  const [dieselUsed, setDieselUsed] = useState<number>(0);

  const [weight, setWeight] = useState<number | ''>('');
  const [uniformity, setUniformity] = useState<number | ''>('');

  const [waterType, setWaterType] = useState<'water' | 'medicine'>('water');
  const [waterLiters, setWaterLiters] = useState<number>(0);
  const [medicineList, setMedicineList] = useState<
    { medicineId: string; name: string; dosagePerLiter?: number }[]
  >([]);

  const [vaccineName, setVaccineName] = useState<string>('');
  const [vaccineNotes, setVaccineNotes] = useState<string>('');

  // Active section tab
  const [activeTab, setActiveTab] = useState<
    'birds' | 'feed' | 'chips' | 'trays' | 'eggs' | 'diesel' | 'weight' | 'medicine' | 'vaccines'
  >('birds');

  // Populate local form state when query resolves
  useEffect(() => {
    if (!recordData) return;
    setMortality(recordData.birds.mortality);
    setLightHours(recordData.birds.lightHours ?? '');
    setMaxTemp(recordData.birds.maxTemperature ?? '');
    setMinTemp(recordData.birds.minTemperature ?? '');

    setFeedArrivalBags(recordData.feed.arrivalBags);
    setFeedUsedBags(recordData.feed.usedBags);
    setFeedReturnedBags(recordData.feed.returnedBags ?? 0);

    setChipsArrivalBags(recordData.chips?.arrivalBags ?? 0);
    setChipsUsedBags(recordData.chips?.usedBags ?? 0);
    setChipsReturnedBags(recordData.chips?.returnedBags ?? 0);

    setPlasticReceived(recordData.trays?.plasticReceived ?? 0);
    setPlasticUsed(recordData.trays?.plasticUsed ?? 0);
    setCardboardReceived(recordData.trays?.cardboardReceived ?? 0);
    setCardboardUsed(recordData.trays?.cardboardUsed ?? 0);
    setCardboardWasted(recordData.trays?.cardboardWasted ?? 0);

    setProdPeti(recordData.eggs.productionPeti);
    setProdTrays(recordData.eggs.productionTrays);
    setSoldPeti(recordData.eggs.soldPeti);
    setSoldTrays(recordData.eggs.soldTrays);

    setEggUsage(recordData.eggUsage || []);

    setDieselArrival(recordData.diesel.arrivalLiters);
    setDieselUsed(recordData.diesel.usedLiters);

    setWeight(recordData.weight ? recordData.weight.weight : '');
    setUniformity(recordData.weight ? recordData.weight.uniformity : '');

    setWaterType(recordData.medicine.type);
    setWaterLiters(recordData.medicine.waterLiters);
    setMedicineList(recordData.medicine.medicines || []);

    setVaccineName(recordData.vaccination?.vaccineName || '');
    setVaccineNotes(recordData.vaccination?.notes || '');

    // Immediate confirmation badge/toast for user upon loading data
    setFeedback({
      type: 'success',
      message: recordData.hasExistingRecord
        ? `Operational record for [${recordData.date}] successfully loaded from database (Committed log in update mode).`
        : `New operational log ready for entry on [${recordData.date}]. Prior carryover balances calculated.`,
    });
  }, [recordData]);

  const shiftDate = (currentDateStr: string, daysOffset: number): string => {
    const [y, m, d] = currentDateStr.split('-').map(Number);
    const target = new Date(Date.UTC(y, m - 1, d + daysOffset));
    return target.toISOString().split('T')[0];
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate || newDate === date) return;
    setDate(newDate);
    setSearchParams({ date: newDate });
    setFeedback({
      type: 'success',
      message: `Fetching operational records for [${newDate}] from database...`,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flockId || !flock) return;

    if (flock.status === 'closed') {
      setFeedback({ type: 'error', message: 'Closed flocks are strictly read-only.' });
      return;
    }

    try {
      setFeedback(null);

      const payload = {
        date,
        birds: {
          mortality: Number(mortality) || 0,
          lightHours: lightHours === '' ? null : Number(lightHours),
          maxTemperature: maxTemp === '' ? null : Number(maxTemp),
          minTemperature: minTemp === '' ? null : Number(minTemp),
        },
        feed: {
          arrivalBags: Number(feedArrivalBags) || 0,
          usedBags: Number(feedUsedBags) || 0,
          returnedBags: Number(feedReturnedBags) || 0,
        },
        chips: {
          arrivalBags: Number(chipsArrivalBags) || 0,
          usedBags: Number(chipsUsedBags) || 0,
          returnedBags: Number(chipsReturnedBags) || 0,
        },
        trays: {
          plasticReceived: Number(plasticReceived) || 0,
          plasticUsed: Number(plasticUsed) || 0,
          cardboardReceived: Number(cardboardReceived) || 0,
          cardboardUsed: Number(cardboardUsed) || 0,
          cardboardWasted: Number(cardboardWasted) || 0,
        },
        eggs: flock.eggTrackingEnabled
          ? {
              productionPeti: Number(prodPeti) || 0,
              productionTrays: Number(prodTrays) || 0,
              soldPeti: Number(soldPeti) || 0,
              soldTrays: Number(soldTrays) || 0,
            }
          : undefined,
        eggUsage: flock.eggTrackingEnabled ? eggUsage : undefined,
        diesel: {
          arrivalLiters: Number(dieselArrival) || 0,
          usedLiters: Number(dieselUsed) || 0,
        },
        weight:
          weight !== '' && uniformity !== ''
            ? {
                weight: Number(weight),
                uniformity: Number(uniformity),
              }
            : null,
        medicine: {
          type: waterType,
          waterLiters: Number(waterLiters) || 0,
          medicines: medicineList,
        },
        vaccination: vaccineName.trim()
          ? {
              vaccineName: vaccineName.trim(),
              notes: vaccineNotes.trim() || undefined,
            }
          : null,
      };

      await saveMutation.mutateAsync(payload);
      setFeedback({
        type: 'success',
        message: isCommitted
          ? `Daily operational record for ${date} successfully updated! Cascading adjustments applied to all subsequent days.`
          : `Daily operational log for ${date} successfully committed to database!`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save daily record' });
    }
  };

  const handleEnableEggTracking = async () => {
    if (!flock || flock.status === 'closed') return;
    try {
      await updateFlockMutation.mutateAsync({
        flockId: flock.id,
        data: { eggTrackingEnabled: true },
      });
      setIsEggConfirmOpen(false);
      setActiveTab('eggs');
      setFeedback({
        type: 'success',
        message: `Egg production tracking successfully activated for flock [${flock.flockCode}]! You can now log egg production and usage below.`,
      });
    } catch (err: any) {
      setIsEggConfirmOpen(false);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to enable egg tracking.',
      });
    }
  };

  // Live calculation estimates with Moat (collective died birds from flock start till today)
  const recordedMoat = recordData?.birds?.moat ?? 0;
  const recordedTodayMortality = recordData?.birds?.mortality ?? 0;
  const priorMoat = Math.max(0, recordedMoat - recordedTodayMortality);
  const currentMoat = priorMoat + (Number(mortality) || 0);
  const currentMoatPercentage = (flock?.initialBirds && flock.initialBirds > 0)
    ? Number(((currentMoat / flock.initialBirds) * 100).toFixed(3))
    : 0;
  const estRemainingBirds = Math.max(0, (flock?.initialBirds || 0) - currentMoat);
  const estFeedKg = (Number(feedUsedBags) || 0) * 50;
  const estFeedPerBirdGrams = calculateFeedPerBirdGrams(Number(feedUsedBags) || 0, estRemainingBirds);
  const estProdEggs = petiTraysToEggs(Number(prodPeti) || 0, Number(prodTrays) || 0);
  const estProdPercentage = calculateProductionPercentage(estProdEggs, estRemainingBirds);
  const estWaterPerBirdMl = calculateWaterPerBirdMl(Number(waterLiters) || 0, estRemainingBirds);
  // Prior Balances from API
  const priorBalances = recordData?.priorBalances;

  // Feed Calculations (Requirements 1.1 - 1.5 + Returns)
  const previousFeedStockBags = priorBalances?.previousFeedStockBags ?? 0;
  const recordedTodayArrivalBags = recordData?.feed?.arrivalBags ?? 0;
  const baseArrivalBags = Math.max(0, (priorBalances?.totalArrivalBagsTillNow ?? 0) - recordedTodayArrivalBags);
  const currentTotalArrivalBagsTillNow = baseArrivalBags + (Number(feedArrivalBags) || 0);

  const recordedTodayReturnedBags = recordData?.feed?.returnedBags ?? 0;
  const baseReturnedBags = Math.max(0, (priorBalances?.totalReturnedBagsTillNow ?? 0) - recordedTodayReturnedBags);
  const currentTotalReturnedBagsTillNow = baseReturnedBags + (Number(feedReturnedBags) || 0);

  const currentRemainingFeedBags = Math.max(
    0,
    previousFeedStockBags + (Number(feedArrivalBags) || 0) - (Number(feedUsedBags) || 0) - (Number(feedReturnedBags) || 0)
  );

  // Chips (Calcium) Calculations
  const previousChipsStockBags = priorBalances?.previousChipsStockBags ?? 0;
  const recordedTodayChipsArrival = recordData?.chips?.arrivalBags ?? 0;
  const baseChipsArrival = Math.max(0, (priorBalances?.totalChipsArrivalBagsTillNow ?? 0) - recordedTodayChipsArrival);
  const currentTotalChipsArrivalTillNow = baseChipsArrival + (Number(chipsArrivalBags) || 0);

  const recordedTodayChipsReturned = recordData?.chips?.returnedBags ?? 0;
  const baseChipsReturned = Math.max(0, (priorBalances?.totalChipsReturnedBagsTillNow ?? 0) - recordedTodayChipsReturned);
  const currentTotalChipsReturnedTillNow = baseChipsReturned + (Number(chipsReturnedBags) || 0);

  const currentRemainingChipsBags = Math.max(
    0,
    previousChipsStockBags + (Number(chipsArrivalBags) || 0) - (Number(chipsUsedBags) || 0) - (Number(chipsReturnedBags) || 0)
  );

  // Plastic Trays Calculations
  const previousPlasticStock = priorBalances?.previousPlasticStockTrays ?? 0;
  const recordedTodayPlasticReceived = recordData?.trays?.plasticReceived ?? 0;
  const basePlasticReceived = Math.max(0, (priorBalances?.totalPlasticReceivedTrays ?? 0) - recordedTodayPlasticReceived);
  const currentTotalPlasticReceivedTillNow = basePlasticReceived + (Number(plasticReceived) || 0);
  const currentRemainingPlasticTrays = Math.max(0, previousPlasticStock + (Number(plasticReceived) || 0) - (Number(plasticUsed) || 0));

  // Cardboard Trays Calculations
  const previousCardboardStock = priorBalances?.previousCardboardStockTrays ?? 0;
  const recordedTodayCardboardReceived = recordData?.trays?.cardboardReceived ?? 0;
  const baseCardboardReceived = Math.max(0, (priorBalances?.totalCardboardReceivedTrays ?? 0) - recordedTodayCardboardReceived);
  const currentTotalCardboardReceivedTillNow = baseCardboardReceived + (Number(cardboardReceived) || 0);

  const recordedTodayCardboardWasted = recordData?.trays?.cardboardWasted ?? 0;
  const baseCardboardWasted = Math.max(0, (priorBalances?.totalCardboardWastedTrays ?? 0) - recordedTodayCardboardWasted);
  const currentTotalCardboardWastedTillNow = baseCardboardWasted + (Number(cardboardWasted) || 0);

  const currentRemainingCardboardTrays = Math.max(
    0,
    previousCardboardStock + (Number(cardboardReceived) || 0) - (Number(cardboardUsed) || 0) - (Number(cardboardWasted) || 0)
  );

  // Egg Calculations (Requirements 2.1 - 2.5)
  const previousEggStock = priorBalances?.previousEggStock ?? { peti: 0, trays: 0, looseEggs: 0, formatted: '0 Peti, 0 Trays' };
  const previousEggStockEggs = petiTraysToEggs(previousEggStock.peti, previousEggStock.trays) + (previousEggStock.looseEggs || 0);
  const estSoldEggs = petiTraysToEggs(Number(soldPeti) || 0, Number(soldTrays) || 0);
  const estUsageEggs = eggUsage.reduce((sum, u) => sum + petiTraysToEggs(Number(u.peti) || 0, Number(u.trays) || 0), 0);
  const estRemainingEggStockEggs = Math.max(0, previousEggStockEggs + estProdEggs - estSoldEggs - estUsageEggs);
  const estRemainingEggStockBreakdown = eggsToPetiTrays(estRemainingEggStockEggs);

  // Diesel Calculations (Requirements 5.1 - 5.3)
  const previousDieselStockLiters = priorBalances?.previousDieselStockLiters ?? 0;
  const currentRemainingDieselLiters = Math.max(
    0,
    previousDieselStockLiters + (Number(dieselArrival) || 0) - (Number(dieselUsed) || 0)
  );

  // Bird Age Calculations (Requirements 6.1 - 6.2)
  const currentBirdAge = flock ? calculateBirdAge(date, flock.startDate) : { week: 1, day: 0, totalDays: 0, formatted: 'W01-D00' };

  const isToday = date === getLocalDateString();
  const isCommitted = Boolean(recordData?.hasExistingRecord);
  const dayNames = ['Sunday (00)', 'Monday (01)', 'Tuesday (02)', 'Wednesday (03)', 'Thursday (04)', 'Friday (05)', 'Saturday (06)'];
  const dayNameFormatted = dayNames[currentBirdAge.day] || `Day ${currentBirdAge.day}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="panel p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5">
              {flock?.flockCode || '...'}
            </span>
            <h1 className="text-base font-bold uppercase tracking-wider">
              Daily Operational Entry
            </h1>
            {flock?.status === 'closed' ? (
              <span className="flex items-center gap-1 text-[10px] font-mono border border-black bg-white px-2 py-0.5 font-bold">
                <Lock className="w-3 h-3" />
                READ-ONLY (CLOSED)
              </span>
            ) : isRecordFetching ? (
              <span className="flex items-center gap-1.5 text-[10px] font-mono border-2 border-black bg-zinc-100 text-black px-2.5 py-0.5 font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-black shrink-0" />
                FETCHING RECORD ({date})...
              </span>
            ) : isCommitted ? (
              <span className="flex items-center gap-1.5 text-[10px] font-mono border-2 border-black bg-black text-white px-2.5 py-0.5 font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                LOADED: Committed Log ({date}) • Update Mode
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-mono border-2 border-zinc-500 bg-white text-black px-2.5 py-0.5 font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                LOADED: New Daily Entry ({date}) • Ready to Commit
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Flock: {flock?.name} • Initial Birds: {flock?.initialBirds.toLocaleString()}
          </p>
        </div>

        {/* Date Selector & Save CTA */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full md:w-auto">
          {/* Quick Prev Day */}
          <button
            type="button"
            onClick={() => handleDateChange(shiftDate(date, -1))}
            className="border border-black px-2.5 py-1.5 text-xs font-mono font-bold hover:bg-zinc-100 bg-white shrink-0 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            title="Previous Day"
          >
            ‹ Prev
          </button>

          <div className="flex items-center gap-2 border border-black px-2.5 sm:px-3 py-1.5 bg-white flex-1 sm:flex-initial justify-between sm:justify-start">
            <Calendar className="w-4 h-4 text-black shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-xs font-mono font-bold uppercase focus:outline-none cursor-pointer bg-transparent w-full sm:w-auto"
            />
          </div>

          {/* Quick Next Day */}
          <button
            type="button"
            onClick={() => handleDateChange(shiftDate(date, 1))}
            className="border border-black px-2.5 py-1.5 text-xs font-mono font-bold hover:bg-zinc-100 bg-white shrink-0 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            title="Next Day"
          >
            Next ›
          </button>

          <button
            type="button"
            onClick={() => handleDateChange(getLocalDateString())}
            className={`border border-black px-2.5 py-1.5 text-xs font-mono uppercase font-semibold transition-colors shrink-0 ${
              isToday ? 'bg-black text-white' : 'hover:bg-zinc-100 bg-white'
            }`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            className="border border-black p-2 hover:bg-zinc-100 shrink-0"
            title="Refresh record"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-black ${isRecordFetching ? 'animate-spin' : ''}`} />
          </button>

          {flock?.status === 'active' && (
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center justify-center gap-2 bg-black text-white px-4 sm:px-5 py-2 sm:py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 w-full sm:w-auto shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>
                {saveMutation.isPending
                  ? (isCommitted ? 'Updating...' : 'Saving...')
                  : (isCommitted ? 'Update Record' : 'Save Record')}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Date Sync Status & Cascade Info Bar */}
      <div
        className={`panel p-3 border-2 border-black font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors ${
          isRecordFetching ? 'bg-zinc-100' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          {isRecordFetching ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-black animate-ping shrink-0" />
              <span className="font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-black shrink-0" />
                Loading operational record for [{date}]...
              </span>
              <span className="text-[10px] bg-black text-white px-2 py-0.5 uppercase font-bold">
                Server Syncing
              </span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 inline-block ring-2 ring-emerald-300" />
              <span className="font-bold uppercase tracking-wider text-black">
                Confirmed Loaded Date: [{date}]
              </span>
              <span className="text-zinc-600">
                • Age: <strong className="text-black">{currentBirdAge.formatted}</strong> ({dayNameFormatted})
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 border ${
                  isCommitted ? 'bg-black text-white border-black' : 'bg-zinc-100 text-zinc-700 border-zinc-400'
                }`}
              >
                {isCommitted ? 'Committed Log • Auto-Cascading Enabled' : 'New Log • Ready for Input'}
              </span>
            </>
          )}
        </div>

        <div className="text-[11px] text-zinc-600 flex items-center gap-3 flex-wrap">
          {isCommitted && !isRecordFetching && (
            <span className="text-emerald-700 font-bold flex items-center gap-1 text-xs">
              <Check className="w-3.5 h-3.5" /> Recalculations Cascade Downstream
            </span>
          )}
          <span className="bg-zinc-100 border border-black px-2 py-0.5 font-bold text-black text-[11px]">
            {isRecordFetching ? 'Syncing balances...' : `Carried Feed Stock: ${previousFeedStockBags} bags`}
          </span>
        </div>
      </div>

      {/* Alerts / Feedback Banner */}
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

      {/* Option to start tracking eggs if disabled */}
      {!flock?.eggTrackingEnabled && flock?.status === 'active' && (
        <div className="panel p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-black bg-zinc-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold shrink-0">
              <Egg className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2 flex-wrap">
                <span>Egg Production Tracking is Disabled</span>
                <span className="text-[10px] font-mono font-normal border border-black bg-white px-1.5 py-0.2">Point of Lay</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-600 mt-0.5">
                Have these birds matured and started laying eggs? Check mark below to activate egg tracking from this record onwards.
              </p>
            </div>
          </div>

          <label className="flex items-center justify-center gap-2.5 cursor-pointer border-2 border-black bg-white px-4 py-2 text-xs font-mono font-bold uppercase hover:bg-zinc-100 w-full sm:w-auto shrink-0 select-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-x-0.5 active:translate-y-0.5">
            <input
              type="checkbox"
              checked={false}
              onChange={() => setIsEggConfirmOpen(true)}
              disabled={updateFlockMutation.isPending}
              className="w-4 h-4 accent-black cursor-pointer"
            />
            <span>{updateFlockMutation.isPending ? 'Activating...' : 'Start Tracking Egg Production'}</span>
          </label>
        </div>
      )}

      {/* Form Tabs Navigation (Horizontal swipeable on mobile) */}
      <div className="border-b border-black flex flex-nowrap overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap gap-1 bg-white p-1">
        {[
          { key: 'birds', label: '1. Birds & Weather' },
          { key: 'feed', label: '2. Feed Inventory' },
          { key: 'chips', label: '3. Chips (Calcium)' },
          { key: 'trays', label: '4. Trays (Plastic & Cardboard)' },
          ...(flock?.eggTrackingEnabled ? [{ key: 'eggs', label: '5. Egg Production & Usage' }] : []),
          { key: 'diesel', label: '6. Diesel Fuel' },
          { key: 'weight', label: '7. Weight & Age' },
          { key: 'medicine', label: '8. Water & Medicine' },
          { key: 'vaccines', label: '9. Vaccination' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-3 sm:px-4 py-2 text-xs font-mono uppercase font-bold transition-all border whitespace-nowrap shrink-0 ${
              activeTab === t.key
                ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-zinc-600 border-transparent hover:text-black hover:bg-zinc-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="panel p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        {isRecordFetching ? (
          <div className="py-16 text-center text-xs font-mono text-zinc-700 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-black" />
            <span className="font-bold text-sm uppercase tracking-wider text-black">
              Fetching operational log for [{date}]...
            </span>
            <span className="text-zinc-500 max-w-md">
              Retrieving live opening stocks, cumulative mortality, and previous day carryovers from server.
            </span>
          </div>
        ) : (
          <>
            {/* Tab 1: Birds & Weather */}
            {activeTab === 'birds' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Bird Mortality & Environmental Conditions
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    Mortality reduces the living flock count and feeds into egg % and feed consumption metrics.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Today's Mortality (Birds) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={mortality}
                      onChange={(e) => setMortality(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Light Hours (0 - 24 hrs)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      disabled={flock?.status === 'closed'}
                      value={lightHours}
                      onChange={(e) => setLightHours(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="e.g. 16.0"
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Max Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={flock?.status === 'closed'}
                      value={maxTemp}
                      onChange={(e) => setMaxTemp(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="e.g. 30.5"
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Min Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={flock?.status === 'closed'}
                      value={minTemp}
                      onChange={(e) => setMinTemp(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="e.g. 22.0"
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>

                {/* Live Calculation Callout with Moat & Moat % */}
                <div className="bg-zinc-100 border border-black p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Initial Birds</span>
                    <span className="font-bold text-sm">{flock?.initialBirds.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Est. Living Birds Today</span>
                    <span className="font-bold text-sm text-black font-tabular">
                      {estRemainingBirds.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-black block text-[10px] uppercase font-bold">
                      Moat (Collective Dead)
                    </span>
                    <span className="font-bold text-base text-black font-tabular block">
                      {currentMoat.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Today: {Number(mortality || 0).toLocaleString()} • Prior: {priorMoat.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-black text-white border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">
                      Moat % (Moat Percentage)
                    </span>
                    <span className="font-bold text-base text-white font-tabular block">
                      {currentMoatPercentage.toFixed(3)}%
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      Collective died % of flock
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Feed Inventory */}
            {activeTab === 'feed' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Daily Feed Arrivals, Usage & Returns
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    1 standard bag = 50 kg (50,000 g). Feed consumption is derived strictly as grams per remaining bird.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Arrival Bags (Received Today)
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={feedArrivalBags}
                      onChange={(e) => setFeedArrivalBags(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                      = {(feedArrivalBags * 50).toLocaleString()} kg received
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Used Bags (Consumed Today)
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={feedUsedBags}
                      onChange={(e) => setFeedUsedBags(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                      = {estFeedKg.toLocaleString()} kg consumed
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Returned Bags (Feed Returned Today)
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={feedReturnedBags}
                      onChange={(e) => setFeedReturnedBags(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                      = {(feedReturnedBags * 50).toLocaleString()} kg returned
                    </span>
                  </div>
                </div>

                {/* Live Feed Stock & Balance Callout */}
                <div className="bg-zinc-100 border border-black p-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Prev. Day Stock</span>
                    <span className="font-bold text-sm">{previousFeedStockBags.toLocaleString()} Bags</span>
                    <span className="text-[10px] text-zinc-500 block">{(previousFeedStockBags * 50).toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Total Received Till Now</span>
                    <span className="font-bold text-sm text-black">{currentTotalArrivalBagsTillNow.toLocaleString()} Bags</span>
                    <span className="text-[10px] text-zinc-500 block">{(currentTotalArrivalBagsTillNow * 50).toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Total Returned Till Now</span>
                    <span className="font-bold text-sm text-black">{currentTotalReturnedBagsTillNow.toLocaleString()} Bags</span>
                    <span className="text-[10px] text-zinc-500 block">{(currentTotalReturnedBagsTillNow * 50).toLocaleString()} kg</span>
                  </div>
                  <div className="bg-white border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-black block text-[10px] uppercase font-bold">Remaining Bags (Auto)</span>
                    <span className="font-bold text-base text-black font-tabular block">
                      {currentRemainingFeedBags.toLocaleString()} Bags
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {(currentRemainingFeedBags * 50).toLocaleString()} kg in stock
                    </span>
                  </div>
                  <div className="bg-black text-white border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Feed Intake / Bird</span>
                    <span className="font-bold text-base text-white font-tabular block">
                      {estFeedPerBirdGrams} g/bird
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      Based on living birds
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Chips (Calcium Supplement) */}
            {activeTab === 'chips' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Chips (Calcium Supplement) Bags Inventory
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    Track daily received, used, and returned calcium chips bags to maintain shell strength and flock calcium balance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Arrival Bags (Received Today)
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={chipsArrivalBags}
                      onChange={(e) => setChipsArrivalBags(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                      Bags received into farm stock
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Used Bags (Fed to Birds Today)
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={chipsUsedBags}
                      onChange={(e) => setChipsUsedBags(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                      Bags mixed/provided to flock today
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Returned Bags (Chips Returned Today)
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={chipsReturnedBags}
                      onChange={(e) => setChipsReturnedBags(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                      Bags returned or sent back
                    </span>
                  </div>
                </div>

                {/* Live Chips Stock & Balance Callout */}
                <div className="bg-zinc-100 border border-black p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Prev. Day Stock</span>
                    <span className="font-bold text-sm">{previousChipsStockBags.toLocaleString()} Bags</span>
                    <span className="text-[10px] text-zinc-500 block">Carried forward</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Total Received Till Now</span>
                    <span className="font-bold text-sm text-black">{currentTotalChipsArrivalTillNow.toLocaleString()} Bags</span>
                    <span className="text-[10px] text-zinc-500 block">Cumulative receipts</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Total Returned Till Now</span>
                    <span className="font-bold text-sm text-black">{currentTotalChipsReturnedTillNow.toLocaleString()} Bags</span>
                    <span className="text-[10px] text-zinc-500 block">Cumulative returns</span>
                  </div>
                  <div className="bg-white border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-black block text-[10px] uppercase font-bold">Remaining Bags (Auto)</span>
                    <span className="font-bold text-base text-black font-tabular block">
                      {currentRemainingChipsBags.toLocaleString()} Bags
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      In farm stock today
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Trays (Plastic & Cardboard) */}
            {activeTab === 'trays' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Trays Inventory Tracking (Plastic & Cardboard)
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    Track reusable plastic trays and disposable cardboard trays separately in one unified dashboard.
                  </p>
                </div>

                {/* Section 1: Plastic Trays */}
                <div className="border-2 border-black p-4 bg-white space-y-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                        1. Plastic Trays (Washable & Reusable)
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-500">
                        Track receipts, usage, and cumulative balance of durable plastic trays.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono border border-black bg-zinc-100 px-2 py-0.5">Reusable</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                        Plastic Trays Received Today
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={flock?.status === 'closed'}
                        value={plasticReceived}
                        onChange={(e) => setPlasticReceived(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                        New plastic trays delivered or returned from market
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                        Plastic Trays Used Today
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={flock?.status === 'closed'}
                        value={plasticUsed}
                        onChange={(e) => setPlasticUsed(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                        Trays packed or dispatched today
                      </span>
                    </div>
                  </div>

                  {/* Plastic Trays Live Callout */}
                  <div className="bg-zinc-50 border border-black p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Prev. Day Stock</span>
                      <span className="font-bold text-sm">{previousPlasticStock.toLocaleString()} Trays</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Total Received Till Now</span>
                      <span className="font-bold text-sm">{currentTotalPlasticReceivedTillNow.toLocaleString()} Trays</span>
                    </div>
                    <div className="bg-white border border-black p-2 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      <span className="text-black block text-[10px] uppercase font-bold">Remaining Plastic Stock (Auto)</span>
                      <span className="font-bold text-base text-black font-tabular block">
                        {currentRemainingPlasticTrays.toLocaleString()} Trays
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Cardboard Trays */}
                <div className="border-2 border-black p-4 bg-white space-y-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                        2. Cardboard Trays (Paper / Single Use)
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-500">
                        Track receipts, packing usage, wastage (broken/damaged), and remaining stock.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono border border-black bg-zinc-100 px-2 py-0.5">Disposable</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                        Cardboard Trays Received Today
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={flock?.status === 'closed'}
                        value={cardboardReceived}
                        onChange={(e) => setCardboardReceived(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                        New cardboard trays delivered
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                        Cardboard Trays Used Today
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={flock?.status === 'closed'}
                        value={cardboardUsed}
                        onChange={(e) => setCardboardUsed(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                        Trays packed for sale
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                        Cardboard Trays Wasted Today
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={flock?.status === 'closed'}
                        value={cardboardWasted}
                        onChange={(e) => setCardboardWasted(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                      />
                      <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                        Torn, wet or damaged trays discarded
                      </span>
                    </div>
                  </div>

                  {/* Cardboard Trays Live Callout */}
                  <div className="bg-zinc-50 border border-black p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Prev. Day Stock</span>
                      <span className="font-bold text-sm">{previousCardboardStock.toLocaleString()} Trays</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Total Received Till Now</span>
                      <span className="font-bold text-sm">{currentTotalCardboardReceivedTillNow.toLocaleString()} Trays</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Total Wasted Till Now</span>
                      <span className="font-bold text-sm">{currentTotalCardboardWastedTillNow.toLocaleString()} Trays</span>
                    </div>
                    <div className="bg-white border border-black p-2 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      <span className="text-black block text-[10px] uppercase font-bold">Remaining Cardboard Stock (Auto)</span>
                      <span className="font-bold text-base text-black font-tabular block">
                        {currentRemainingCardboardTrays.toLocaleString()} Trays
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Eggs */}
            {activeTab === 'eggs' && flock?.eggTrackingEnabled && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                      Egg Production, Sales & Stock
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-500">
                      1 Peti = 12 Trays = 360 Eggs • 1 Tray = 30 Eggs
                    </p>
                  </div>
                  <div className="border border-black bg-zinc-100 px-3 py-1.5 text-xs font-mono">
                    <span className="text-[10px] text-zinc-500 uppercase block">Prev. Day Remaining Stock (Auto)</span>
                    <span className="font-bold text-black">{previousEggStock.formatted}</span>
                    <span className="text-[10px] text-zinc-500 ml-1">({previousEggStockEggs.toLocaleString()} eggs)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Production */}
                  <div className="border border-black p-4 bg-zinc-50 space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider block border-b border-black pb-1">
                      Today's Production
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono uppercase mb-1">Production Peti</label>
                        <input
                          type="number"
                          min="0"
                          disabled={flock?.status === 'closed'}
                          value={prodPeti}
                          onChange={(e) => setProdPeti(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full border border-black px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono uppercase mb-1">Production Trays</label>
                        <input
                          type="number"
                          min="0"
                          max="11"
                          disabled={flock?.status === 'closed'}
                          value={prodTrays}
                          onChange={(e) => setProdTrays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full border border-black px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="text-xs font-mono text-zinc-700">
                      Total Eggs: <span className="font-bold">{estProdEggs.toLocaleString()}</span> • Production %: <span className="font-bold">{estProdPercentage}%</span>
                    </div>
                  </div>

                  {/* Sales */}
                  <div className="border border-black p-4 bg-zinc-50 space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider block border-b border-black pb-1">
                      Today's Sales
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono uppercase mb-1">Sold Peti</label>
                        <input
                          type="number"
                          min="0"
                          disabled={flock?.status === 'closed'}
                          value={soldPeti}
                          onChange={(e) => setSoldPeti(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full border border-black px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono uppercase mb-1">Sold Trays</label>
                        <input
                          type="number"
                          min="0"
                          max="11"
                          disabled={flock?.status === 'closed'}
                          value={soldTrays}
                          onChange={(e) => setSoldTrays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full border border-black px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="text-xs font-mono text-zinc-700">
                      Sold Eggs: <span className="font-bold">{petiTraysToEggs(soldPeti, soldTrays).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Egg Usage Section */}
                <div className="border border-black p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">Internal Egg Usage & Waste</h4>
                      <p className="text-[10px] font-mono text-zinc-500">
                        Categories: gift-use, conveyor-waste, mess-use, store-waste
                      </p>
                    </div>
                    {flock?.status === 'active' && (
                      <button
                        type="button"
                        onClick={() =>
                          setEggUsage([
                            ...eggUsage,
                            { id: crypto.randomUUID(), type: 'conveyor-waste', peti: 0, trays: 1 },
                          ])
                        }
                        className="flex items-center gap-1 border border-black px-2.5 py-1 text-[11px] font-mono uppercase hover:bg-zinc-100"
                      >
                        <Plus className="w-3 h-3" /> Add Usage Row
                      </button>
                    )}
                  </div>

                  {eggUsage.length === 0 ? (
                    <p className="text-xs font-mono text-zinc-400 py-3 text-center">
                      No internal usage or waste logged for this date.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {eggUsage.map((u, idx) => (
                        <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 border border-zinc-200 p-2.5 bg-zinc-50">
                          <select
                            value={u.type}
                            disabled={flock?.status === 'closed'}
                            onChange={(e) => {
                              const updated = [...eggUsage];
                              updated[idx].type = e.target.value as any;
                              setEggUsage(updated);
                            }}
                            className="w-full sm:w-auto border border-black px-2 py-1.5 text-xs font-mono uppercase bg-white"
                          >
                            <option value="gift-use">gift-use</option>
                            <option value="conveyor-waste">conveyor-waste</option>
                            <option value="mess-use">mess-use</option>
                            <option value="store-waste">store-waste</option>
                          </select>

                          <div className="flex items-center gap-1 text-xs font-mono">
                            <input
                              type="number"
                              min="0"
                              disabled={flock?.status === 'closed'}
                              value={u.peti}
                              onChange={(e) => {
                                const updated = [...eggUsage];
                                updated[idx].peti = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setEggUsage(updated);
                              }}
                              className="w-16 border border-black px-2 py-1 text-xs font-mono"
                            />
                            <span>Peti</span>
                          </div>

                          <div className="flex items-center gap-1 text-xs font-mono">
                            <input
                              type="number"
                              min="0"
                              max="11"
                              disabled={flock?.status === 'closed'}
                              value={u.trays}
                              onChange={(e) => {
                                const updated = [...eggUsage];
                                updated[idx].trays = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setEggUsage(updated);
                              }}
                              className="w-16 border border-black px-2 py-1 text-xs font-mono"
                            />
                            <span>Trays</span>
                          </div>

                          <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">
                            = {petiTraysToEggs(u.peti, u.trays)} eggs
                          </span>

                          {flock?.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => setEggUsage(eggUsage.filter((_, i) => i !== idx))}
                              className="ml-auto text-zinc-500 hover:text-black p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Egg Stock & Production % Callout (Requirements 2.1 - 2.5) */}
                <div className="bg-zinc-100 border border-black p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Opening Stock</span>
                    <span className="font-bold text-sm">{previousEggStock.peti}P, {previousEggStock.trays}T</span>
                    <span className="text-[10px] text-zinc-500 block">{previousEggStockEggs.toLocaleString()} eggs</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Today Net Movement</span>
                    <span className="font-bold text-sm text-black">
                      +{estProdEggs.toLocaleString()} / -{(estSoldEggs + estUsageEggs).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Prod: {Number(prodPeti) || 0}P, {Number(prodTrays) || 0}T • Sold: {Number(soldPeti) || 0}P, {Number(soldTrays) || 0}T
                    </span>
                  </div>
                  <div className="bg-white border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-black block text-[10px] uppercase font-bold">Total Remaining Stock (Auto)</span>
                    <span className="font-bold text-base text-black font-tabular block">
                      {estRemainingEggStockBreakdown.formatted}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {estRemainingEggStockEggs.toLocaleString()} total eggs in stock
                    </span>
                  </div>
                  <div className="bg-black text-white border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Production % (Auto)</span>
                    <span className="font-bold text-base text-white font-tabular block">
                      {estProdPercentage}%
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {estProdEggs.toLocaleString()} eggs / {estRemainingBirds.toLocaleString()} birds
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Diesel Fuel */}
            {activeTab === 'diesel' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Diesel Generator & Operational Fuel
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    Canonical unit: Liters. Negative stock is rejected by system validation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Arrival Liters (Delivered Today)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={dieselArrival}
                      onChange={(e) => setDieselArrival(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Used Liters (Burned Today)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={dieselUsed}
                      onChange={(e) => setDieselUsed(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Diesel Fuel Stock Callout (Requirements 5.1 - 5.3) */}
                <div className="bg-zinc-100 border border-black p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Prev. Remaining Fuel</span>
                    <span className="font-bold text-sm">{previousDieselStockLiters.toFixed(1)} L</span>
                    <span className="text-[10px] text-zinc-500 block">Balance prior to today</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Today Delivery</span>
                    <span className="font-bold text-sm text-black">+{Number(dieselArrival) || 0} L</span>
                    <span className="text-[10px] text-zinc-500 block">Added to reserve</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Today Burned</span>
                    <span className="font-bold text-sm text-black">-{Number(dieselUsed) || 0} L</span>
                    <span className="text-[10px] text-zinc-500 block">Subtracted from reserve</span>
                  </div>
                  <div className="bg-black text-white border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Remaining Diesel (Auto)</span>
                    <span className="font-bold text-base text-white font-tabular block">
                      {currentRemainingDieselLiters.toFixed(1)} Liters
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      Net operations reserve
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Weight & Age */}
            {activeTab === 'weight' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Flock Bird Weight, Uniformity & Age
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    Week and day are auto-calculated from flock placement reference date.
                  </p>
                </div>

                {/* Auto-Calculated Flock Age Banner (Requirements 6.1 - 6.2) */}
                <div className="bg-zinc-100 border border-black p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Week No (Auto)</span>
                    <span className="font-bold text-base text-black font-tabular block">
                      Week {currentBirdAge.week < 10 ? `0${currentBirdAge.week}` : currentBirdAge.week}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">Calculated from start date</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Day No (Auto)</span>
                    <span className="font-bold text-base text-black font-tabular block">
                      Day {currentBirdAge.day < 10 ? `0${currentBirdAge.day}` : currentBirdAge.day}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">{dayNameFormatted}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Total Life Duration</span>
                    <span className="font-bold text-sm text-black block">
                      {currentBirdAge.totalDays} Days
                    </span>
                    <span className="text-[10px] text-zinc-500 block">Started {flock?.startDate}</span>
                  </div>
                  <div className="bg-white border border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-black block text-[10px] uppercase font-bold">Standard Age Tag</span>
                    <span className="font-bold text-base text-black font-tabular block">
                      {currentBirdAge.formatted}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      Sunday = 00 convention
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Sample Average Weight (Grams)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      disabled={flock?.status === 'closed'}
                      value={weight}
                      onChange={(e) => setWeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="e.g. 1750"
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Uniformity Percentage (0 - 100%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      disabled={flock?.status === 'closed'}
                      value={uniformity}
                      onChange={(e) => setUniformity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="e.g. 88.5"
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 6: Water & Medicine */}
            {activeTab === 'medicine' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Water Supply & Medicine Treatment
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    Multiple medicines are supported without arbitrary limits. Water/bird is derived in ml.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Entry Type
                    </label>
                    <div className="flex gap-2">
                      {(['water', 'medicine'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          disabled={flock?.status === 'closed'}
                          onClick={() => setWaterType(t)}
                          className={`flex-1 py-2 text-xs font-mono uppercase font-bold border ${
                            waterType === t
                              ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                              : 'bg-white text-zinc-600 border-zinc-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Water Volume (Liters)
                    </label>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      disabled={flock?.status === 'closed'}
                      value={waterLiters}
                      onChange={(e) => setWaterLiters(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                      = {estWaterPerBirdMl} ml per bird
                    </span>
                  </div>
                </div>

                {waterType === 'medicine' && (
                  <div className="border border-black p-4 bg-zinc-50 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Prescribed Medicines for Today
                      </span>
                      {flock?.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => {
                            const firstMed = medicinesMaster[0];
                            if (firstMed) {
                              setMedicineList([
                                ...medicineList,
                                { medicineId: firstMed.id, name: firstMed.name, dosagePerLiter: 1.0 },
                              ]);
                            }
                          }}
                          className="flex items-center gap-1 border border-black px-2.5 py-1 text-[11px] font-mono uppercase hover:bg-zinc-100"
                        >
                          <Plus className="w-3 h-3" /> Add Medicine
                        </button>
                      )}
                    </div>

                    {medicineList.length === 0 ? (
                      <p className="text-xs font-mono text-zinc-400 py-2 text-center">
                        No medicines assigned yet. Click "Add Medicine".
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {medicineList.map((m, idx) => (
                          <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 border border-zinc-300 p-2.5 bg-white">
                            <select
                              value={m.medicineId}
                              disabled={flock?.status === 'closed'}
                              onChange={(e) => {
                                const found = medicinesMaster.find((x) => x.id === e.target.value);
                                const updated = [...medicineList];
                                updated[idx] = {
                                  ...updated[idx],
                                  medicineId: e.target.value,
                                  name: found?.name || '',
                                };
                                setMedicineList(updated);
                              }}
                              className="w-full sm:flex-1 border border-black px-2 py-1.5 text-xs font-mono uppercase bg-white"
                            >
                              {medicinesMaster.map((med) => (
                                <option key={med.id} value={med.id}>
                                  {med.name}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1 text-xs font-mono">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                disabled={flock?.status === 'closed'}
                                value={m.dosagePerLiter || ''}
                                onChange={(e) => {
                                  const updated = [...medicineList];
                                  updated[idx].dosagePerLiter = parseFloat(e.target.value) || 0;
                                  setMedicineList(updated);
                                }}
                                placeholder="Dosage"
                                className="w-20 border border-black px-2 py-1 text-xs font-mono"
                              />
                              <span>ml/L</span>
                            </div>

                            {flock?.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => setMedicineList(medicineList.filter((_, i) => i !== idx))}
                                className="ml-auto text-zinc-500 hover:text-black p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 7: Vaccination */}
            {activeTab === 'vaccines' && (
              <div className="space-y-6">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Vaccination Record
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-500">
                    Record immunization events administered on this date.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Vaccine Name
                    </label>
                    <input
                      type="text"
                      disabled={flock?.status === 'closed'}
                      value={vaccineName}
                      onChange={(e) => setVaccineName(e.target.value)}
                      placeholder="e.g. Newcastle Disease (ND) Lasota Live"
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Administration Notes / Batch Number
                    </label>
                    <textarea
                      rows={3}
                      disabled={flock?.status === 'closed'}
                      value={vaccineNotes}
                      onChange={(e) => setVaccineNotes(e.target.value)}
                      placeholder="e.g. Administered via eye-drop method by veterinarian Dr. Smith."
                      className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Save Bar */}
      {flock?.status === 'active' && (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 p-4 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-mono text-zinc-600">
            {isCommitted ? (
              <span>
                <strong className="text-black font-bold">Committed log active for {date}.</strong> Any modifications above will update this day's record.
              </span>
            ) : (
              <span>
                <strong className="text-black font-bold">Pending log entry for {date}.</strong> Fill in the daily numbers above and click commit to log for this day.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-black text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5 shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>
              {saveMutation.isPending
                ? (isCommitted ? 'Updating Record...' : 'Committing to Database...')
                : (isCommitted ? `Update Daily Record for ${date}` : `Commit Daily Record for ${date}`)}
            </span>
          </button>
        </div>
      )}

      {/* Egg Tracking Confirmation Overlay */}
      <ConfirmModal
        isOpen={isEggConfirmOpen}
        title="Activate Egg Production Tracking"
        icon={<Egg className="w-4 h-4 text-white" />}
        message={`Are you sure you want to start tracking egg production for flock [${flock?.flockCode}] ${flock?.name} from this record forward?\n\nOnce confirmed, egg production, sales, usage, and inventory tracking will be permanently activated for this flock.`}
        confirmLabel="Activate Egg Tracking"
        cancelLabel="Cancel"
        isLoading={updateFlockMutation.isPending}
        onConfirm={handleEnableEggTracking}
        onCancel={() => setIsEggConfirmOpen(false)}
      />
    </div>
  );
};
