import React, { useState } from 'react';
import { Flock, UnifiedDailyRecord } from '../../types/index.js';
import { useDailyRecordQuery } from '../../lib/queries.js';
import { downloadDailyAuditPdf, printDailyAuditPdf } from '../../lib/audit-pdf-generator.js';
import {
  calculateBirdAge,
  petiTraysToEggs,
  eggsToPetiTrays,
  sumPetiTrays,
  normalizePetiTrays,
  calculateProductionPercentage,
  calculateFeedPerBirdGrams,
  calculateWaterPerBirdMl,
} from '../../lib/calculations.js';
import {
  Download,
  Printer,
  X,
  FileSpreadsheet,
  Check,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface DailyAuditPdfModalProps {
  isOpen: boolean;
  date: string;
  flock: Flock;
  onClose: () => void;
}

export const DailyAuditPdfModal: React.FC<DailyAuditPdfModalProps> = ({
  isOpen,
  date,
  flock,
  onClose,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: record, isLoading, error } = useDailyRecordQuery(
    isOpen ? flock.id : undefined,
    isOpen ? date : undefined
  );

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!record) return;
    try {
      setIsGenerating(true);
      downloadDailyAuditPdf(flock, record);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!record) return;
    printDailyAuditPdf(flock, record);
  };

  // Live calculated variables for on-screen ledger preview
  const initialBirds = flock.initialBirds;
  const cumulativeMoat = record?.birds?.moat ?? 0;
  const livingBirds = Math.max(0, initialBirds - cumulativeMoat);
  const moatPct = record?.birds?.moatPercentage ?? 0;
  const birdAge = calculateBirdAge(date, flock.startDate);
  const calendarWeekday = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const dayName = `Day 0${birdAge.day} • ${calendarWeekday}`;

  // Feed math
  const prevFeed = record?.priorBalances?.previousFeedStockBags ?? 0;
  const feedArrival = record?.feed?.arrivalBags ?? 0;
  const feedUsed = record?.feed?.usedBags ?? 0;
  const feedReturned = record?.feed?.returnedBags ?? 0;
  const closingFeed = Math.max(0, prevFeed + feedArrival - feedUsed - feedReturned);
  const feedPerBirdGrams = calculateFeedPerBirdGrams(feedUsed, livingBirds);

  // Chips math
  const prevChips = record?.priorBalances?.previousChipsStockBags ?? 0;
  const chipsArrival = record?.chips?.arrivalBags ?? 0;
  const chipsUsed = record?.chips?.usedBags ?? 0;
  const chipsReturned = record?.chips?.returnedBags ?? 0;
  const closingChips = Math.max(0, prevChips + chipsArrival - chipsUsed - chipsReturned);

  // Trays math
  const prevPlastic = record?.priorBalances?.previousPlasticStockTrays ?? 0;
  const plasticRecv = record?.trays?.plasticReceived ?? 0;
  const plasticUsed = record?.trays?.plasticUsed ?? 0;
  const closingPlastic = Math.max(0, prevPlastic + plasticRecv - plasticUsed);

  const prevCardboard = record?.priorBalances?.previousCardboardStockTrays ?? 0;
  const cardboardRecv = record?.trays?.cardboardReceived ?? 0;
  const cardboardUsed = record?.trays?.cardboardUsed ?? 0;
  const cardboardWasted = record?.trays?.cardboardWasted ?? 0;
  const closingCardboard = Math.max(0, prevCardboard + cardboardRecv - cardboardUsed - cardboardWasted);

  // Egg math
  const prevEggs = record?.priorBalances?.previousEggStock ?? { peti: 0, trays: 0, looseEggs: 0, formatted: '0 Peti, 0 Trays' };
  const prevEggTotal = petiTraysToEggs(prevEggs.peti, prevEggs.trays) + (prevEggs.looseEggs || 0);
  const prodPeti = record?.eggs?.productionPeti ?? 0;
  const prodTrays = record?.eggs?.productionTrays ?? 0;
  const prodTotalEggs = petiTraysToEggs(prodPeti, prodTrays);
  const eggProdPct = calculateProductionPercentage(prodTotalEggs, livingBirds);
  const soldPeti = record?.eggs?.soldPeti ?? 0;
  const soldTrays = record?.eggs?.soldTrays ?? 0;
  const soldTotalEggs = petiTraysToEggs(soldPeti, soldTrays);
  const usageEggsTotal = (record?.eggUsage || []).reduce(
    (sum, u) => sum + petiTraysToEggs(u.peti, u.trays),
    0
  );
  const closingEggTotal = Math.max(0, prevEggTotal + prodTotalEggs - soldTotalEggs - usageEggsTotal);
  const closingEggBreakdown = eggsToPetiTrays(closingEggTotal);

  // Cumulative egg production till date
  const cumulativeEggFormatted = record?.eggs?.cumulativeProductionFormatted ?? (
    record?.priorBalances?.totalProducedEggsTillDate?.formatted ?? (
      sumPetiTrays([
        { peti: record?.priorBalances?.priorTotalProducedEggs?.peti ?? 0, trays: record?.priorBalances?.priorTotalProducedEggs?.trays ?? 0 },
        { peti: prodPeti, trays: prodTrays },
      ]).formatted
    )
  );
  const cumulativeEggEggs = record?.eggs?.cumulativeProductionEggs ?? (
    record?.priorBalances?.totalProducedEggsTillDate?.totalEggs ?? (
      sumPetiTrays([
        { peti: record?.priorBalances?.priorTotalProducedEggs?.peti ?? 0, trays: record?.priorBalances?.priorTotalProducedEggs?.trays ?? 0 },
        { peti: prodPeti, trays: prodTrays },
      ]).totalEggs
    )
  );

  // Diesel math
  const prevDiesel = record?.priorBalances?.previousDieselStockLiters ?? 0;
  const dieselArrival = record?.diesel?.arrivalLiters ?? 0;
  const dieselUsed = record?.diesel?.usedLiters ?? 0;
  const closingDiesel = Math.max(0, prevDiesel + dieselArrival - dieselUsed);

  // Water & Meds
  const waterLiters = record?.medicine?.waterLiters ?? 0;
  const waterPerBirdMl = calculateWaterPerBirdMl(waterLiters, livingBirds);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] my-auto max-h-[92vh] flex flex-col">
        {/* Top Action Bar */}
        <div className="p-3 sm:p-4 border-b-2 border-black bg-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5">
              {flock.flockCode}
            </span>
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm uppercase tracking-wider">
              <FileSpreadsheet className="w-4 h-4 text-black shrink-0" />
              <span>Daily Audit Report PDF • {date}</span>
            </div>
            {record?.hasExistingRecord ? (
              <span className="text-[10px] font-mono border border-black bg-black text-white px-2 py-0.5 font-bold uppercase">
                Committed Log Verified
              </span>
            ) : (
              <span className="text-[10px] font-mono border border-zinc-400 bg-white text-zinc-600 px-2 py-0.5 font-bold uppercase">
                Uncommitted Draft
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {downloadSuccess && (
              <span className="flex items-center gap-1 text-xs font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-500 px-2 py-1">
                <Check className="w-3.5 h-3.5" /> PDF Downloaded!
              </span>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={isLoading || !record || isGenerating}
              className="flex items-center gap-1.5 bg-black text-white border border-black px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoading || !record}
              className="flex items-center gap-1.5 bg-white text-black border border-black px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-zinc-100 disabled:opacity-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="border border-black p-1.5 hover:bg-zinc-200 transition-colors shrink-0"
              title="Close modal"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable Ledger Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-zinc-50 font-mono text-xs">
          {isLoading ? (
            <div className="py-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-black" />
              <span className="font-bold text-sm text-black uppercase tracking-wider">
                Compiling all operational tabs for {date}...
              </span>
              <span className="text-xs">Preparing official ledger sheet.</span>
            </div>
          ) : error ? (
            <div className="p-4 border-2 border-black bg-zinc-100 text-black flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load daily audit record: {error.message}</span>
            </div>
          ) : record ? (
            <div className="bg-white border-2 border-black p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
              {/* Company Header Block (Modeled after S.S. Feed Mills Paper Report) */}
              <div className="text-center border-b-2 border-black pb-3 space-y-1">
                <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
                  {flock.companyName || 'S. S. FEED MILLS (PVT) LTD'}
                </h1>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-zinc-700">
                  POULTRY LAYER SHED • DAILY OPERATIONAL & PRODUCTION AUDIT REPORT
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Flock: [{flock.flockCode}] {flock.name} • Audit Date: <strong>{date}</strong> • Age: <strong>{birdAge.formatted}</strong> ({dayName})
                </p>
              </div>

              {/* Flock Metadata Strip */}
              <div className="border border-black bg-zinc-100 p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div><span className="text-zinc-500">Placement Date:</span> <strong>{flock.startDate}</strong></div>
                <div><span className="text-zinc-500">Initial Birds:</span> <strong>{initialBirds.toLocaleString()}</strong></div>
                <div><span className="text-zinc-500">Living Balance:</span> <strong>{livingBirds.toLocaleString()}</strong></div>
                <div><span className="text-zinc-500">Moat % Today:</span> <strong>{moatPct}%</strong></div>
              </div>

              {/* 1. Bird Flock Population & Environment */}
              <div className="border border-black">
                <div className="bg-zinc-200 border-b border-black px-2.5 py-1 font-bold text-[11px] uppercase tracking-wider flex justify-between items-center">
                  <span>1. Bird Flock Status & Environment</span>
                  <span className={`text-[10px] px-2 py-0.5 border border-black font-bold uppercase ${record.birds?.manureRemoved ? 'bg-black text-white' : 'bg-white text-zinc-700'}`}>
                    Manure Out: {record.birds?.manureRemoved ? 'YES (Cleaned Today)' : 'NO'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-black text-[11px]">
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">TODAY MORTALITY</span><strong>{record.birds?.mortality ?? 0} birds</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">CUMULATIVE MOAT</span><strong>{cumulativeMoat} ({moatPct}%)</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">LIGHT DURATION</span><strong>{record.birds?.lightHours ? `${record.birds.lightHours} hrs` : 'N/A'}</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">MAX / MIN TEMP</span><strong>{record.birds?.maxTemperature ?? '--'}°C / {record.birds?.minTemperature ?? '--'}°C</strong></div>
                  <div className="p-2 bg-zinc-50"><span className="text-zinc-500 block text-[10px]">MANURE OUT</span><strong className={record.birds?.manureRemoved ? 'text-black font-bold' : 'text-zinc-500'}>{record.birds?.manureRemoved ? 'YES' : 'NO'}</strong></div>
                </div>
              </div>

              {/* 2. Feed Inventory & Nutrition */}
              <div className="border border-black">
                <div className="bg-zinc-200 border-b border-black px-2.5 py-1 font-bold text-[11px] uppercase tracking-wider flex justify-between">
                  <span>2. Feed Inventory & Consumption (50kg Bags)</span>
                  <span className="text-black font-bold">Intake: {feedPerBirdGrams} g/bird</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-black text-[11px]">
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">CARRIED STOCK</span><strong>{prevFeed} bags ({prevFeed * 50} kg)</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">ARRIVAL TODAY</span><strong>{feedArrival} bags ({feedArrival * 50} kg)</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">CONSUMED TODAY</span><strong>{feedUsed} bags ({feedUsed * 50} kg)</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">RETURNED TODAY</span><strong>{feedReturned} bags ({feedReturned * 50} kg)</strong></div>
                  <div className="p-2 bg-zinc-100"><span className="text-zinc-500 block text-[10px]">CLOSING STOCK</span><strong className="text-black">{closingFeed} bags ({closingFeed * 50} kg)</strong></div>
                </div>
              </div>

              {/* 3. Calcium Chips Bags */}
              <div className="border border-black">
                <div className="bg-zinc-200 border-b border-black px-2.5 py-1 font-bold text-[11px] uppercase tracking-wider">
                  3. Chips (Calcium Supplement) Bags Inventory
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-black text-[11px]">
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">CARRIED CHIPS</span><strong>{prevChips} bags</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">ARRIVAL TODAY</span><strong>{chipsArrival} bags</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">SPREAD / USED</span><strong>{chipsUsed} bags</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">RETURNED TODAY</span><strong>{chipsReturned} bags</strong></div>
                  <div className="p-2 bg-zinc-100"><span className="text-zinc-500 block text-[10px]">CLOSING CHIPS</span><strong className="text-black">{closingChips} bags</strong></div>
                </div>
              </div>

              {/* 4. Trays Inventory */}
              <div className="border border-black">
                <div className="bg-zinc-200 border-b border-black px-2.5 py-1 font-bold text-[11px] uppercase tracking-wider">
                  4. Trays Inventory (Plastic & Cardboard)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-black text-[11px]">
                  <div className="p-2 space-y-1">
                    <span className="font-bold uppercase text-[10px] text-zinc-600 block">PLASTIC TRAYS</span>
                    <div className="flex justify-between"><span>Opening Stock:</span> <strong>{prevPlastic}</strong></div>
                    <div className="flex justify-between"><span>Received Today:</span> <strong>{plasticRecv}</strong></div>
                    <div className="flex justify-between"><span>Used Today:</span> <strong>{plasticUsed}</strong></div>
                    <div className="flex justify-between border-t border-zinc-300 pt-1"><span>Closing Stock:</span> <strong className="text-black">{closingPlastic} trays</strong></div>
                  </div>
                  <div className="p-2 space-y-1">
                    <span className="font-bold uppercase text-[10px] text-zinc-600 block">CARDBOARD TRAYS</span>
                    <div className="flex justify-between"><span>Opening Stock:</span> <strong>{prevCardboard}</strong></div>
                    <div className="flex justify-between"><span>Received Today:</span> <strong>{cardboardRecv}</strong></div>
                    <div className="flex justify-between"><span>Used / Wasted:</span> <strong>Used: {cardboardUsed} | Waste: {cardboardWasted}</strong></div>
                    <div className="flex justify-between border-t border-zinc-300 pt-1"><span>Closing Stock:</span> <strong className="text-black">{closingCardboard} trays</strong></div>
                  </div>
                </div>
              </div>

              {/* 5. Egg Production & Dispatches (if enabled) */}
              {flock.eggTrackingEnabled && (
                <div className="border border-black">
                  <div className="bg-zinc-200 border-b border-black px-2.5 py-1 font-bold text-[11px] uppercase tracking-wider flex justify-between">
                    <span>5. Egg Production, Sales & Internal Usage</span>
                    <span className="text-black font-bold">Laying: {eggProdPct}%</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-black text-[11px]">
                    <div className="p-2"><span className="text-zinc-500 block text-[10px]">CARRIED STOCK</span><strong>{prevEggs.formatted}</strong></div>
                    <div className="p-2"><span className="text-zinc-500 block text-[10px]">PRODUCTION TODAY</span><strong>{prodPeti}p {prodTrays}t ({prodTotalEggs.toLocaleString()} eggs)</strong></div>
                    <div className="p-2 bg-zinc-50"><span className="text-zinc-500 block text-[10px]">TOTAL PRODUCED TILL NOW</span><strong className="text-black">{cumulativeEggFormatted}</strong><span className="text-[10px] text-zinc-500 block">({cumulativeEggEggs.toLocaleString()} eggs)</span></div>
                    <div className="p-2"><span className="text-zinc-500 block text-[10px]">SOLD / DISPATCHED</span><strong>{soldPeti}p {soldTrays}t ({soldTotalEggs.toLocaleString()} eggs)</strong></div>
                    <div className="p-2 bg-zinc-100"><span className="text-zinc-500 block text-[10px]">CLOSING STOCK</span><strong className="text-black">{closingEggBreakdown.formatted}</strong></div>
                  </div>
                  {(record.eggUsage || []).length > 0 && (
                    <div className="p-2 bg-zinc-50 border-t border-black text-[10px] text-zinc-600">
                      <strong>Internal Dispatches:</strong> {(record.eggUsage || []).map((u) => `${u.type.replace('-', ' ')}: ${u.peti}p ${u.trays}t`).join(' • ')} (Total: {usageEggsTotal.toLocaleString()} eggs)
                    </div>
                  )}
                </div>
              )}

              {/* 6. Diesel Fuel Audit */}
              <div className="border border-black">
                <div className="bg-zinc-200 border-b border-black px-2.5 py-1 font-bold text-[11px] uppercase tracking-wider">
                  6. Diesel Fuel Inventory (Liters)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black text-[11px]">
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">OPENING DIESEL</span><strong>{prevDiesel} Liters</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">ARRIVAL TODAY</span><strong>{dieselArrival} Liters</strong></div>
                  <div className="p-2"><span className="text-zinc-500 block text-[10px]">CONSUMED TODAY</span><strong>{dieselUsed} Liters</strong></div>
                  <div className="p-2 bg-zinc-100"><span className="text-zinc-500 block text-[10px]">REMAINING IN TANK</span><strong className="text-black">{closingDiesel} Liters</strong></div>
                </div>
              </div>

              {/* 7 & 8. Weight & Water / Medication */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-black">
                  <div className="bg-zinc-200 border-b border-black px-2.5 py-1 font-bold text-[11px] uppercase tracking-wider">
                    7. Body Weight & Uniformity
                  </div>
                  <div className="p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between"><span>Sample Weight:</span> <strong>{record.weight?.weight ? `${record.weight.weight} g` : 'Not recorded'}</strong></div>
                    <div className="flex justify-between"><span>Flock Uniformity:</span> <strong>{record.weight?.uniformity ? `${record.weight.uniformity}%` : 'Not recorded'}</strong></div>
                  </div>
                </div>

                <div className="border border-black">
                  <div className="bg-zinc-200 border-b border-black px-2.5 py-1 font-bold text-[11px] uppercase tracking-wider">
                    8. Water & Medication
                  </div>
                  <div className="p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between"><span>Water Intake:</span> <strong>{waterLiters} L ({waterPerBirdMl} ml/bird)</strong></div>
                    <div className="flex justify-between"><span>Regimen Type:</span> <strong>{record.medicine?.type === 'medicine' ? 'Medicated Water' : 'Fresh Water'}</strong></div>
                    {(record.medicine?.medicines || []).length > 0 && (
                      <div className="text-[10px] text-zinc-600 border-t border-zinc-200 pt-1">
                        Meds: {(record.medicine?.medicines || []).map((m) => `${m.name} (${m.dosagePerLiter || 0} ml/L)`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 9. Vaccination & Notes */}
              <div className="border border-black">
                <div className="bg-zinc-200 border-b border-black px-2.5 py-1 font-bold text-[11px] uppercase tracking-wider">
                  9. Vaccination & Veterinary Log
                </div>
                <div className="p-2.5 text-[11px] space-y-1">
                  <div><span className="text-zinc-500">Vaccine Administered:</span> <strong>{record.vaccination?.vaccineName || 'None administered on this date'}</strong></div>
                  <div><span className="text-zinc-500">Clinical Observations:</span> <span className="text-zinc-700">{record.vaccination?.notes || 'Normal health state'}</span></div>
                </div>
              </div>

              {/* 10. Official Sign-off Block (Modeled after S.S. Feed Mills official sheet) */}
              <div className="border border-black pt-2 pb-3 px-4 bg-zinc-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-center text-zinc-600 mb-3 border-b border-zinc-300 pb-1">
                  Official Verification & Operational Sign-off
                </div>
                <div className="grid grid-cols-3 gap-4 text-center text-[10px]">
                  <div className="space-y-4">
                    <div className="font-bold text-zinc-700">PREPARED BY (OPERATOR)</div>
                    <div className="border-b border-black w-3/4 mx-auto pb-1 text-zinc-400">Signature / Date</div>
                  </div>
                  <div className="space-y-4">
                    <div className="font-bold text-zinc-700">SHED SUPERVISOR</div>
                    <div className="border-b border-black w-3/4 mx-auto pb-1 text-zinc-400">Signature / Date</div>
                  </div>
                  <div className="space-y-4">
                    <div className="font-bold text-zinc-700">FARM MANAGER</div>
                    <div className="border-b border-black w-3/4 mx-auto pb-1 text-zinc-400">Signature / Date</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
