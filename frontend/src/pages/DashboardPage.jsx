import { useAnimals, useBeneficiaries, useActiveAnimalsMap, useDispersalSummary } from '../api/hooks';
import { Beef, Users, MapPin, ArrowLeftRight, TrendingUp } from 'lucide-react';
import DispersalMap from '../components/map/DispersalMap';

export default function DashboardPage() {
  const { data: animals } = useAnimals({ page_size: 200 });
  const { data: beneficiaries } = useBeneficiaries({ page_size: 200 });
  const { data: mapData } = useActiveAnimalsMap();
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
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
    },
    {
      label: 'Active Beneficiaries',
      value: beneficiaryCount,
      icon: Users,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
    },
    {
      label: 'Currently Dispersed',
      value: dispersedCount,
      icon: MapPin,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
    },
    {
      label: 'Map Active Points',
      value: activeMapPoints,
      icon: TrendingUp,
      color: 'bg-amber-500',
      bgLight: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`${kpi.bgLight} rounded-xl p-5 border border-gray-100`}
            >
              <div className="flex items-center gap-3">
                <div className={`${kpi.color} rounded-lg p-2.5 text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispersal Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-700">{summary.total_dispersals}</p>
              <p className="text-sm text-green-600">Initial Dispersals</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-700">{summary.total_redispersals}</p>
              <p className="text-sm text-blue-600">Re-Dispersals</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-700">
                {summary.total_dispersals + summary.total_redispersals}
              </p>
              <p className="text-sm text-gray-600">Total Transactions</p>
            </div>
          </div>

          {/* By species */}
          {summary.by_species?.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500 mb-3">By Species</h4>
              <div className="space-y-2">
                {summary.by_species.map((s) => (
                  <div key={s.animal__species__name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-32">{s.animal__species__name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full"
                        style={{
                          width: `${Math.min((s.dispersals / summary.total_dispersals) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">{s.dispersals}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Animals Map</h3>
          <p className="text-sm text-gray-500">
            Geo-tagged locations of all currently dispersed animals
          </p>
        </div>
        <div className="h-[500px]">
          <DispersalMap features={mapData?.features || []} />
        </div>
      </div>
    </div>
  );
}
