import { useState } from 'react';
import { useBeneficiaries, useBarangays } from '../api/hooks';
import { Search, Users, ChevronDown, MapPin, Phone } from 'lucide-react';
import BeneficiaryDetailModal from '../components/BeneficiaryDetailModal';

function CardSkeleton({ count = 6 }) {
  return (
    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="skeleton h-5 w-32 rounded mb-2" />
              <div className="skeleton h-3.5 w-24 rounded" />
            </div>
            <div className="skeleton h-5 w-14 rounded-full" />
          </div>
          <div className="mt-4 flex gap-4">
            <div className="skeleton h-3.5 w-24 rounded" />
            <div className="skeleton h-3.5 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BeneficiariesPage() {
  const [search, setSearch] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState(null);


  const params = {};
  if (search) params.search = search;
  if (barangayFilter) params.barangay = barangayFilter;
  if (statusFilter) params.is_active_beneficiary = statusFilter;

  const { data, isLoading } = useBeneficiaries(params);
  const { data: barangays } = useBarangays();

  const beneficiaries = data?.results || [];
  const activeFilterCount = [barangayFilter, statusFilter].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Beneficiaries</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading ? 'Loading...' : `${data?.count || 0} registered beneficiaries`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or contact..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all"
              aria-label="Search beneficiaries"
            />
          </div>
          <div className="relative">
            <select
              value={barangayFilter}
              onChange={(e) => setBarangayFilter(e.target.value)}
              className="appearance-none w-full sm:w-48 pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all cursor-pointer"
              aria-label="Filter by barangay"
            >
              <option value="">All Barangays</option>
              {barangays?.results?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full sm:w-40 pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all cursor-pointer"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Active filters:</span>
            {barangayFilter && (
              <button
                onClick={() => setBarangayFilter('')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors"
              >
                Barangay: {barangays?.results?.find((b) => String(b.id) === barangayFilter)?.name}
                <span className="ml-0.5">×</span>
              </button>
            )}
            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                Status: {statusFilter === 'true' ? 'Active' : 'Inactive'}
                <span className="ml-0.5">×</span>
              </button>
            )}
            <button
              onClick={() => { setBarangayFilter(''); setStatusFilter(''); }}
              className="text-xs text-slate-400 hover:text-slate-600 ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <CardSkeleton />
        ) : beneficiaries.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">No beneficiaries found</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {search || barangayFilter || statusFilter
                ? 'Try adjusting your filters or search terms.'
                : 'Beneficiaries will appear here once registered.'}
            </p>
          </div>
        ) : (
          beneficiaries.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedBeneficiaryId(b.id)}
              className="bg-white rounded-2xl border border-slate-200/60 p-5 hover:border-green-300/60 hover:shadow-md transition-all duration-200 cursor-pointer stagger-item group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedBeneficiaryId(b.id); }}}
              aria-label={`View ${b.full_name}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0">
                    {b.full_name?.[0] || 'B'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-green-700 transition-colors">{b.full_name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {b.barangay_name}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${
                  b.is_active_beneficiary ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10' : 'bg-slate-100 text-slate-500'
                }`}>
                  {b.is_active_beneficiary ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-3.5 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {b.contact_number || 'No contact'}
                </span>
                <span className="font-medium text-green-600">
                  {b.current_animal_count} animals
                </span>
              </div>

              {b.latitude && b.longitude && (
                <p className="text-[11px] text-slate-400 mt-2 font-mono">
                  {Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedBeneficiaryId && (
        <BeneficiaryDetailModal
          beneficiaryId={selectedBeneficiaryId}
          onClose={() => setSelectedBeneficiaryId(null)}
        />
      )}
    </div>
  );
}
