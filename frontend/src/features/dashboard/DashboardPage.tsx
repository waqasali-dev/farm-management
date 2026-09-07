import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { Flock, DashboardData, HealthStatus } from '../../types/index.js';
import { api } from '../../lib/api-client.js';
import {
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Package,
  Egg,
  Fuel,
  Droplets,
  Scale,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface OutletContextType {
  activeFlock: Flock | null;
  flocks: Flock[];
  refreshFlocks: () => void;
  health: HealthStatus | null;
}

export const DashboardPage: React.FC = () => {
  const { activeFlock } = useOutletContext<OutletContextType>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [date, setDate] = useState<string>(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (flockId: string, targetDate: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboard(flockId, targetDate);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeFlock?.id) {
      fetchDashboardData(activeFlock.id, date);
    }
  }, [activeFlock?.id, date]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setSearchParams({ flock: activeFlock?.id || '', date: newDate });
  };

  if (!activeFlock) {
    return (
      <div className="panel p-12 text-center max-w-xl mx-auto my-12">
        <h2 className="text-base font-bold uppercase tracking-wider mb-2">No Active Flock Selected</h2>
        <p className="text-xs text-zinc-600 mb-6 font-mono">
          Every record in the system is isolated by flock. Select or create a flock to view operational data.
        </p>
        <button
          onClick={() => navigate('/flocks')}
          className="bg-black text-white px-5 py-2 text-xs font-bold uppercase tracking-wider border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-800"
        >
          Manage Flocks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Date Selector */}
      <div className="panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold bg-black text-white px-2 py-0.5">
              {activeFlock.flockCode}
            </span>
            <h2 className="text-base font-bold tracking-tight uppercase">
              {activeFlock.name}
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 uppercase font-bold border ${
                activeFlock.status === 'active'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-zinc-600 border-zinc-400'
              }`}
            >
              [{activeFlock.status}]
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs font-mono text-zinc-600">
            <span>Started: {activeFlock.startDate}</span>
            <span>•</span>
            <span className="font-bold text-black">
              Age: {data?.birdAge ? data.birdAge.formatted : 'Calculating...'} ({data?.birdAge ? `${data.birdAge.totalDays} days` : ''})
            </span>
            <span>•</span>
            <span>Initial Birds: {activeFlock.initialBirds.toLocaleString()}</span>
          </div>
        </div>

        {/* Date Selector & Daily Entry Quick Link */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-black px-3 py-1.5 bg-white">
            <Calendar className="w-3.5 h-3.5 text-black" />
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-xs font-mono font-bold uppercase focus:outline-none cursor-pointer bg-transparent"
            />
          </div>

          <button
            onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
            className="border border-black px-2.5 py-1.5 text-xs font-mono uppercase hover:bg-zinc-100 font-semibold"
            title="Jump to today"
          >
            Today
          </button>

          <button
            onClick={() => fetchDashboardData(activeFlock.id, date)}
            className="border border-black p-2 hover:bg-zinc-100"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-black ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate(`/flocks/${activeFlock.id}/daily?date=${date}`)}
            className="flex items-center gap-2 bg-black text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <span>Enter Daily Record</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="border border-black bg-zinc-100 p-4 space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-black">
            <AlertTriangle className="w-4 h-4 text-black" />
            <span>Operational Warnings for {date}</span>
          </div>
          {data.alerts.map((alert, idx) => (
            <p key={idx} className="text-xs font-mono pl-6 text-zinc-800">
              • {alert}
            </p>
          ))}
        </div>
      )}

      {error && (
        <div className="border border-black bg-zinc-100 p-4 text-xs font-mono">
          [ERROR] {error}
        </div>
      )}

      {/* Primary KPI Grid (Section 21) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Birds & Mortality */}
        <div className="panel p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-black pb-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                Birds Population
              </span>
              <TrendingDown className="w-4 h-4 text-black" />
            </div>
            <div className="text-3xl font-bold font-tabular tracking-tight">
              {data ? data.birds.remaining.toLocaleString() : '---'}
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1">
              Active living birds
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-200 grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase">Today Mortality</span>
              <span className="font-bold">{data?.birds.todayMortality ?? 0}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase">Cumulative Mort. %</span>
              <span className="font-bold">{data?.birds.mortalityRate ?? 0}%</span>
            </div>
          </div>
        </div>

        {/* Card 2: Feed Stock & Consumption */}
        <div className="panel p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-black pb-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                Feed Inventory
              </span>
              <Package className="w-4 h-4 text-black" />
            </div>
            <div className="text-3xl font-bold font-tabular tracking-tight">
              {data ? `${data.feed.remainingBags.toLocaleString()} Bags` : '---'}
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1">
              {data ? `${(data.feed.remainingBags * 50).toLocaleString()} kg in stock` : ''}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-200 grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase">Today Used</span>
              <span className="font-bold">{data?.feed.todayUsedBags ?? 0} bags</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase">Feed / Bird</span>
              <span className="font-bold">{data?.feed.consumptionGramsPerBird ?? 0} g/bird</span>
            </div>
          </div>
        </div>

        {/* Card 3: Eggs (Only if enabled) */}
        {activeFlock.eggTrackingEnabled ? (
          <div className="panel p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-black pb-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  Egg Production & Stock
                </span>
                <Egg className="w-4 h-4 text-black" />
              </div>
              <div className="text-2xl font-bold font-tabular tracking-tight">
                {data?.eggs?.stockFormatted ?? '0 Peti, 0 Trays'}
              </div>
              <div className="text-[11px] font-mono text-zinc-500 mt-1">
                {data?.eggs?.currentStockEggs ? `${data.eggs.currentStockEggs.toLocaleString()} total eggs in stock` : '0 eggs'}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Today Production</span>
                <span className="font-bold">
                  {data?.eggs?.todayProductionPeti ?? 0}P, {data?.eggs?.todayProductionTrays ?? 0}T
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Production %</span>
                <span className="font-bold">{data?.eggs?.productionPercentage ?? 0}%</span>
              </div>
            </div>
          </div>
        ) : (
          /* Card 3 (Alternative for meat flocks): Diesel Generator Fuel */
          <div className="panel p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-black pb-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  Diesel Fuel Stock
                </span>
                <Fuel className="w-4 h-4 text-black" />
              </div>
              <div className="text-3xl font-bold font-tabular tracking-tight">
                {data ? `${data.diesel.remainingLiters.toFixed(1)} L` : '---'}
              </div>
              <div className="text-[11px] font-mono text-zinc-500 mt-1">
                Generator & operations reserve
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Today Arrival</span>
                <span className="font-bold">{data?.diesel.todayArrivalLiters ?? 0} L</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Today Used</span>
                <span className="font-bold">{data?.diesel.todayUsedLiters ?? 0} L</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Water Intake */}
        <div className="panel p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-black pb-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                Water Consumption
              </span>
              <Droplets className="w-4 h-4 text-black" />
            </div>
            <div className="text-3xl font-bold font-tabular tracking-tight">
              {data ? `${data.water.liters.toLocaleString()} L` : '---'}
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1">
              Water intake today
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-200 text-xs font-mono">
            <span className="text-zinc-500 block text-[10px] uppercase">Water per Bird</span>
            <span className="font-bold">{data?.water.mlPerBird ?? 0} ml/bird</span>
          </div>
        </div>

        {/* Card 5: Diesel (If Egg card was shown above, show diesel here) */}
        {activeFlock.eggTrackingEnabled && (
          <div className="panel p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-black pb-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  Diesel Fuel Stock
                </span>
                <Fuel className="w-4 h-4 text-black" />
              </div>
              <div className="text-3xl font-bold font-tabular tracking-tight">
                {data ? `${data.diesel.remainingLiters.toFixed(1)} L` : '---'}
              </div>
              <div className="text-[11px] font-mono text-zinc-500 mt-1">
                Generator & equipment reserve
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Today Used</span>
                <span className="font-bold">{data?.diesel.todayUsedLiters ?? 0} L</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Today Arrival</span>
                <span className="font-bold">{data?.diesel.todayArrivalLiters ?? 0} L</span>
              </div>
            </div>
          </div>
        )}

        {/* Card 6: Bird Weight & Uniformity */}
        <div className="panel p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-black pb-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                Latest Sample Weight
              </span>
              <Scale className="w-4 h-4 text-black" />
            </div>
            <div className="text-3xl font-bold font-tabular tracking-tight">
              {data?.weight ? `${data.weight.weight} g` : 'No Record'}
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1">
              {data?.weight ? `Weighed on ${data.weight.date}` : 'Record weight on sample day'}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-200 text-xs font-mono">
            <span className="text-zinc-500 block text-[10px] uppercase">Uniformity</span>
            <span className="font-bold">{data?.weight ? `${data.weight.uniformity}%` : '---'}</span>
          </div>
        </div>
      </div>

      {/* Monochrome Charts (Section 46: Strictly Monochrome) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Chart 1: Daily Mortality Trend */}
        <div className="panel p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-4 border-b border-black pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Mortality History (Recent Dates)
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Unit: Birds</span>
          </div>
          <div className="h-64 w-full">
            {data?.trendData && data.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trendData}>
                  <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#000000" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="#000000" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#000000',
                      borderRadius: 0,
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mortality"
                    stroke="#000000"
                    strokeWidth={2}
                    dot={{ fill: '#000000', r: 4 }}
                    name="Daily Mortality"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-400">
                No trend history recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Daily Feed Usage */}
        <div className="panel p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-4 border-b border-black pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Daily Feed Usage History
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Unit: 50kg Bags</span>
          </div>
          <div className="h-64 w-full">
            {data?.trendData && data.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trendData}>
                  <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#000000" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="#000000" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#000000',
                      borderRadius: 0,
                      fontFamily: 'monospace',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="feedBags" fill="#000000" name="Feed Used (Bags)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-400">
                No feed history recorded yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
