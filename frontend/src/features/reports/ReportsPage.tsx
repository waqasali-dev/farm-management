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
  const [reportType, setReportType] = useState<'summary' | 'mortality' | 'feed' | 'eggs'>('summary');

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
      <div className="panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-black" />
            <h1 className="text-base font-bold uppercase tracking-wider">
              Flock Audit & Production Reports
            </h1>
          </div>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Flock: [{activeFlock.flockCode}] {activeFlock.name} • Start Date: {activeFlock.startDate}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Report Type Selector */}
          <div className="border border-black p-0.5 flex bg-zinc-100 text-xs font-mono">
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'mortality', label: 'Mortality' },
              { id: 'feed', label: 'Feed' },
              ...(activeFlock.eggTrackingEnabled ? [{ id: 'eggs', label: 'Eggs' }] : []),
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setReportType(t.id as any)}
                className={`px-3 py-1 uppercase font-semibold transition-all ${
                  reportType === t.id ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

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
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Age</th>
                      <th className="py-2.5 px-3">Mortality</th>
                      <th className="py-2.5 px-3">Cumul. Mort.</th>
                      <th className="py-2.5 px-3">Remaining Birds</th>
                      <th className="py-2.5 px-3">Mort. %</th>
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
                          <td className="py-2 px-3">{row.cumulativeMortality}</td>
                          <td className="py-2 px-3 font-tabular font-semibold">
                            {row.remainingBirds.toLocaleString()}
                          </td>
                          <td className="py-2 px-3">{row.mortalityRate}%</td>
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
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Daily Mortality</th>
                      <th className="py-2.5 px-3">Cumulative Mortality</th>
                      <th className="py-2.5 px-3">Remaining Living Birds</th>
                      <th className="py-2.5 px-3">Cumulative Mortality %</th>
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
                          <td className="py-2 px-3">{row.cumulativeMortality}</td>
                          <td className="py-2 px-3 font-tabular font-semibold">
                            {row.remainingBirds.toLocaleString()}
                          </td>
                          <td className="py-2 px-3">{row.mortalityRate}%</td>
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
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Arrival (Bags)</th>
                      <th className="py-2.5 px-3">Arrival (Kg)</th>
                      <th className="py-2.5 px-3">Used (Bags)</th>
                      <th className="py-2.5 px-3">Used (Kg)</th>
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
                          <td className="py-2 px-3 font-bold">{row.stockBags}</td>
                          <td className="py-2 px-3 font-bold">{row.stockKg.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-400">
                          No feed records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {reportType === 'eggs' && (
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-black bg-zinc-100 text-[10px] uppercase text-zinc-600">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Production (Peti/Trays)</th>
                      <th className="py-2.5 px-3">Production (Eggs)</th>
                      <th className="py-2.5 px-3">Sold (Peti/Trays)</th>
                      <th className="py-2.5 px-3">Sold (Eggs)</th>
                      <th className="py-2.5 px-3">Usage / Waste (Eggs)</th>
                      <th className="py-2.5 px-3">Closing Stock (Eggs)</th>
                      <th className="py-2.5 px-3">Closing Stock (Formatted)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {data?.rows && data.rows.length > 0 ? (
                      data.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="py-2 px-3 font-bold">{row.date}</td>
                          <td className="py-2 px-3">{row.productionPeti}P, {row.productionTrays}T</td>
                          <td className="py-2 px-3 font-tabular">{row.productionEggs.toLocaleString()}</td>
                          <td className="py-2 px-3">{row.soldPeti}P, {row.soldTrays}T</td>
                          <td className="py-2 px-3 font-tabular">{row.soldEggs.toLocaleString()}</td>
                          <td className="py-2 px-3 font-tabular">{row.usageEggs.toLocaleString()}</td>
                          <td className="py-2 px-3 font-tabular font-bold">{row.closingStockEggs.toLocaleString()}</td>
                          <td className="py-2 px-3 font-semibold">{row.closingStockFormatted}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-400">
                          No egg records found or egg tracking disabled.
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
