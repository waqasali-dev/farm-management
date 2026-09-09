import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Flock, HealthStatus } from '../../types/index.js';
import { useReportsQuery } from '../../lib/queries.js';
import { FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';

interface OutletContextType {
  activeFlock: Flock | null;
  flocks: Flock[];
  refreshFlocks: () => void;
  health: HealthStatus | null;
}

export const ReportsPage: React.FC = () => {
  const { activeFlock } = useOutletContext<OutletContextType>();
  const [reportType, setReportType] = useState<
    'summary' | 'mortality' | 'feed' | 'chips' | 'trays' | 'eggs' | 'diesel' | 'weight' | 'health'
  >('summary');

  // TanStack Query for Reports (Section 30, 31)
  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useReportsQuery(activeFlock?.id, reportType);

  const handlePrint = () => {
    window.print();
  };

  if (!activeFlock) {
    return (
      <div className="panel p-12 text-center max-w-lg mx-auto">
        <h2 className="text-sm font-bold uppercase tracking-wider">No Flock Selected</h2>
        <p className="text-xs text-zinc-500 font-mono mt-1">Select an active flock to view audits and reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Report Header */}
      <div className="panel p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-black shrink-0" />
            <h1 className="text-base font-bold uppercase tracking-wider">
              Flock Audit & Production Reports
            </h1>
          </div>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Flock: [{activeFlock.flockCode}] {activeFlock.name} • Start Date: {activeFlock.startDate}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full md:w-auto">
          {/* Report Type Selector (Horizontal swipeable on mobile) */}
          <div className="border border-black p-0.5 flex flex-nowrap overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap bg-zinc-100 text-xs font-mono max-w-full">
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'mortality', label: 'Mortality' },
              { id: 'feed', label: 'Feed' },
              { id: 'chips', label: 'Chips' },
              { id: 'trays', label: 'Trays' },
              ...(activeFlock.eggTrackingEnabled ? [{ id: 'eggs', label: 'Eggs' }] : []),
              { id: 'diesel', label: 'Diesel' },
              { id: 'weight', label: 'Weight & Age' },
              { id: 'health', label: 'Health & Vaccines' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setReportType(t.id as any)}
                className={`px-3 py-1.5 sm:py-1 uppercase font-semibold transition-all whitespace-nowrap shrink-0 ${
                  reportType === t.id ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button
              onClick={() => refetch()}
              className="border border-black p-2 hover:bg-zinc-100"
              title="Refresh report"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-black ${isFetching ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 border border-black bg-white px-3 py-1.5 text-xs font-mono font-bold uppercase hover:bg-zinc-100"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {queryError && (
        <div className="p-4 border border-black bg-zinc-100 text-xs font-mono">
          [ERROR] {queryError.message}
        </div>
      )}

      {/* Report Table View */}
      <div className="panel overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              Generating report from database...
            </div>
          ) : (
            <>
              {reportType === 'summary' && (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[780px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Age</th>
                      <th className="py-2.5 px-3">Today Mort.</th>
                      <th className="py-2.5 px-3">Moat (Cumul.)</th>
                      <th className="py-2.5 px-3">Remaining Birds</th>
                      <th className="py-2.5 px-3">Moat %</th>
                      <th className="py-2.5 px-3">Feed (Bags)</th>
                      <th className="py-2.5 px-3">Feed (g/bird)</th>
                      {activeFlock.eggTrackingEnabled && <th className="py-2.5 px-3">Eggs (Total)</th>}
                      {activeFlock.eggTrackingEnabled && <th className="py-2.5 px-3">Egg Prod %</th>}
                      <th className="py-2.5 px-3">Diesel (L)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3">{row.age}</td>
                          <td className="py-2 px-3">{row.mortality}</td>
                          <td className="py-2 px-3 font-semibold">{row.moat ?? row.cumulativeMortality}</td>
                          <td className="py-2 px-3 font-tabular font-semibold">
                            {row.remainingBirds.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-semibold">{row.moatPercentage ?? row.mortalityRate}%</td>
                          <td className="py-2 px-3">{row.feedUsedBags}</td>
                          <td className="py-2 px-3">{row.feedConsumptionGrams}</td>
                          {activeFlock.eggTrackingEnabled && (
                            <td className="py-2 px-3 font-tabular">{row.eggProductionEggs.toLocaleString()}</td>
                          )}
                          {activeFlock.eggTrackingEnabled && (
                            <td className="py-2 px-3 font-semibold">{row.eggProductionPct}%</td>
                          )}
                          <td className="py-2 px-3">{row.dieselUsedLiters}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-zinc-400">
                          No operational logs found for this flock.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'mortality' && (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[650px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Daily Mortality</th>
                      <th className="py-2.5 px-3">Moat (Cumulative Dead)</th>
                      <th className="py-2.5 px-3">Remaining Living Birds</th>
                      <th className="py-2.5 px-3">Moat % (Total Mortality)</th>
                      <th className="py-2.5 px-3">Light Hours</th>
                      <th className="py-2.5 px-3">Max Temp (°C)</th>
                      <th className="py-2.5 px-3">Min Temp (°C)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3">{row.mortality}</td>
                          <td className="py-2 px-3 font-semibold">{row.moat ?? row.cumulativeMortality}</td>
                          <td className="py-2 px-3 font-tabular font-semibold">
                            {row.remainingBirds.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-semibold">{row.moatPercentage ?? row.mortalityRate}%</td>
                          <td className="py-2 px-3">{row.lightHours ?? '---'}</td>
                          <td className="py-2 px-3">{row.maxTemp ?? '---'}</td>
                          <td className="py-2 px-3">{row.minTemp ?? '---'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-400">
                          No mortality records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'feed' && (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[750px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Arrival (Bags)</th>
                      <th className="py-2.5 px-3">Arrival (Kg)</th>
                      <th className="py-2.5 px-3">Used (Bags)</th>
                      <th className="py-2.5 px-3">Used (Kg)</th>
                      <th className="py-2.5 px-3">Returned (Bags)</th>
                      <th className="py-2.5 px-3">Returned (Kg)</th>
                      <th className="py-2.5 px-3">Closing Stock (Bags)</th>
                      <th className="py-2.5 px-3">Closing Stock (Kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3">{row.arrivalBags}</td>
                          <td className="py-2 px-3">{(row.arrivalBags * 50).toLocaleString()}</td>
                          <td className="py-2 px-3">{row.usedBags}</td>
                          <td className="py-2 px-3">{row.usedKg.toLocaleString()}</td>
                          <td className="py-2 px-3">{row.returnedBags ?? 0}</td>
                          <td className="py-2 px-3">{((row.returnedBags ?? 0) * 50).toLocaleString()}</td>
                          <td className="py-2 px-3 font-bold">{row.stockBags}</td>
                          <td className="py-2 px-3 font-bold">{row.stockKg.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-zinc-400">
                          No feed records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'chips' && (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[650px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Arrival (Bags)</th>
                      <th className="py-2.5 px-3">Used (Bags)</th>
                      <th className="py-2.5 px-3">Returned (Bags)</th>
                      <th className="py-2.5 px-3">Closing Stock (Bags)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3">{row.arrivalBags}</td>
                          <td className="py-2 px-3">{row.usedBags}</td>
                          <td className="py-2 px-3">{row.returnedBags ?? 0}</td>
                          <td className="py-2 px-3 font-bold">{row.stockBags}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-400">
                          No chips records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'trays' && (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[750px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-200 text-[10px] uppercase text-black font-bold">
                      <th className="py-2.5 px-3" rowSpan={2}>Date</th>
                      <th className="py-2 px-3 text-center border-l border-zinc-300 bg-zinc-100" colSpan={3}>
                        Plastic Trays (Reusable)
                      </th>
                      <th className="py-2 px-3 text-center border-l border-zinc-300 bg-zinc-100" colSpan={4}>
                        Cardboard Trays (Disposable)
                      </th>
                    </tr>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-1.5 px-3 border-l border-zinc-300">Received</th>
                      <th className="py-1.5 px-3">Used</th>
                      <th className="py-1.5 px-3 font-bold">Stock</th>
                      <th className="py-1.5 px-3 border-l border-zinc-300">Received</th>
                      <th className="py-1.5 px-3">Used</th>
                      <th className="py-1.5 px-3">Wasted</th>
                      <th className="py-1.5 px-3 font-bold">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3 border-l border-zinc-200">{row.plasticReceived}</td>
                          <td className="py-2 px-3">{row.plasticUsed}</td>
                          <td className="py-2 px-3 font-bold">{row.plasticStock}</td>
                          <td className="py-2 px-3 border-l border-zinc-200">{row.cardboardReceived}</td>
                          <td className="py-2 px-3">{row.cardboardUsed}</td>
                          <td className="py-2 px-3 text-red-600 font-semibold">{row.cardboardWasted}</td>
                          <td className="py-2 px-3 font-bold">{row.cardboardStock}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-400">
                          No tray records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'eggs' && (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[900px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Opening Stock</th>
                      <th className="py-2.5 px-3">Production (P/T)</th>
                      <th className="py-2.5 px-3">Prod (Eggs)</th>
                      <th className="py-2.5 px-3">Sold (P/T)</th>
                      <th className="py-2.5 px-3">Sold (Eggs)</th>
                      <th className="py-2.5 px-3">Gift Use</th>
                      <th className="py-2.5 px-3">Conveyor Waste</th>
                      <th className="py-2.5 px-3">Mess Use</th>
                      <th className="py-2.5 px-3">Store Waste</th>
                      <th className="py-2.5 px-3">Total Waste (Eggs)</th>
                      <th className="py-2.5 px-3">Closing Stock (P/T)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3">{row.openingStockFormatted}</td>
                          <td className="py-2 px-3">{row.productionPeti}P, {row.productionTrays}T</td>
                          <td className="py-2 px-3 font-tabular">{row.productionEggs.toLocaleString()}</td>
                          <td className="py-2 px-3">{row.soldPeti}P, {row.soldTrays}T</td>
                          <td className="py-2 px-3 font-tabular">{row.soldEggs.toLocaleString()}</td>
                          <td className="py-2 px-3 text-zinc-600">{row.giftUse}</td>
                          <td className="py-2 px-3 text-zinc-600">{row.conveyorWaste}</td>
                          <td className="py-2 px-3 text-zinc-600">{row.messUse}</td>
                          <td className="py-2 px-3 text-zinc-600">{row.storeWaste}</td>
                          <td className="py-2 px-3 font-tabular">{row.usageEggs.toLocaleString()}</td>
                          <td className="py-2 px-3 font-semibold">{row.closingStockFormatted}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-zinc-400">
                          No egg records found or egg tracking disabled.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'diesel' && (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[500px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Arrival (Liters)</th>
                      <th className="py-2.5 px-3">Used (Liters)</th>
                      <th className="py-2.5 px-3">Closing Stock Balance (Liters)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3 font-tabular">{row.arrivalLiters.toFixed(1)} L</td>
                          <td className="py-2 px-3 font-tabular">{row.usedLiters.toFixed(1)} L</td>
                          <td className="py-2 px-3 font-bold font-tabular">{row.stockLiters.toFixed(1)} L</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-400">
                          No diesel fuel records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'weight' && (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[600px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Flock Age Tag</th>
                      <th className="py-2.5 px-3">Week No (Auto)</th>
                      <th className="py-2.5 px-3">Day No (Auto)</th>
                      <th className="py-2.5 px-3">Sample Weight (Grams)</th>
                      <th className="py-2.5 px-3">Uniformity (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3 font-semibold">{row.age}</td>
                          <td className="py-2 px-3">Week {row.week < 10 ? `0${row.week}` : row.week}</td>
                          <td className="py-2 px-3">Day {row.day < 10 ? `0${row.day}` : row.day}</td>
                          <td className="py-2 px-3 font-tabular font-bold">{row.weight} g</td>
                          <td className="py-2 px-3 font-tabular font-semibold">{row.uniformity}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-400">
                          No weight or growth records conducted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'health' && (
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[700px]">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Intake Type</th>
                      <th className="py-2.5 px-3">Water Volume (L)</th>
                      <th className="py-2.5 px-3">Water Intake / Bird</th>
                      <th className="py-2.5 px-3">Prescribed Medicines & Dosages</th>
                      <th className="py-2.5 px-3">Vaccine Administered</th>
                      <th className="py-2.5 px-3">Vaccine Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 border ${row.type === 'medicine' ? 'bg-black text-white border-black font-bold' : 'border-zinc-300'}`}>
                              {row.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-tabular">{row.waterLiters.toLocaleString()} L</td>
                          <td className="py-2 px-3 font-tabular">{row.waterPerBirdMl} ml/bird</td>
                          <td className="py-2 px-3">{row.medicines}</td>
                          <td className="py-2 px-3 font-semibold">{row.vaccineName}</td>
                          <td className="py-2 px-3 text-zinc-500">{row.vaccineNotes}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-400">
                          No health, medicine, or vaccination logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
