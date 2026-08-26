import { useAnimals, useBeneficiaries, useActiveAnimalsMap, useDispersalSummary } from '../api/hooks';
import { Beef, Users, MapPin, TrendingUp, ArrowUpRight, BarChart3 } from 'lucide-react';
import DispersalMap from '../components/map/DispersalMap';

function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="skeleton w-11 h-11 rounded-xl" />
        <div className="flex-1">
          <div className="skeleton h-3 w-20 rounded mb-2" />
          <div className="skeleton h-7 w-14 rounded" />
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, gradient, trend }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm card-hover stagger-item">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${gradient}`}>
            <Icon className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {value.toLocaleString()}
            </p>
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
            <ArrowUpRight className="h-3 w-3" />
            {trend}%
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: animals, isLoading: animalsLoading } = useAnimals({ page_size: 200 });
  const { data: beneficiaries, isLoading: benLoading } = useBeneficiaries({ page_size: 200 });
  const { data: mapData, isLoading: mapLoading } = useActiveAnimalsMap();
  const { data: summary } = useDispersalSummary();

  const animalCount = animals?.count || 0;
  const beneficiaryCount = beneficiaries?.count || 0;
  const dispersedCount = animals?.results?.filter((a) => a.current_status === 'DISPERSED').length || 0;
  const activeMapPoints = mapData?.features?.length || 0;

  const kpis = [
    {
      label: 'Total Animals',
      value: animalCount,
      icon: Beef,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    {
      label: 'Active Beneficiaries',
      value: beneficiaryCount,
      icon: Users,
      gradient: 'bg-gradient-to-br from-emerald-500 to-green-600',
    },
    {
      label: 'Currently Dispersed',
      value: dispersedCount,
      icon: MapPin,
      gradient: 'bg-gradient-to-br from-purple-500 to-violet-600',
    },
    {
      label: 'Geo-Tagged Points',
      value: activeMapPoints,
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-500',
    },
  ];

  const maxSpecies = summary?.by_species?.length
    ? Math.max(...summary.by_species.map((s) => s.dispersals))
    : 1;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {animalsLoading || benLoading || mapLoading
          ? Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
          : kpis.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
      </div>

      {/* Summary + Map row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Summary Stats */}
        {summary && (
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                Dispersal Summary
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100/60">
                  <div>
                    <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wide">Initial Dispersals</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-0.5">{summary.total_dispersals}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Beef className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/60">
                  <div>
                    <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wide">Re-Dispersals</p>
                    <p className="text-2xl font-bold text-blue-700 mt-0.5">{summary.total_redispersals}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-200/60">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Total Transactions</p>
                    <p className="text-2xl font-bold text-slate-700 mt-0.5">
                      {summary.total_dispersals + summary.total_redispersals}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* By species breakdown */}
            {summary.by_species?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">By Species</h3>
                <div className="space-y-3">
                  {summary.by_species.map((s) => (
                    <div key={s.animal__species__name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700">{s.animal__species__name}</span>
                        <span className="text-sm font-semibold text-slate-900">{s.dispersals}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.min((s.dispersals / maxSpecies) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Active Animals Map</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Geo-tagged locations of all currently dispersed animals
            </p>
          </div>
          <div className="h-[500px]">
            <DispersalMap features={mapData?.features || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
