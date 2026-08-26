import { useState, useMemo } from 'react';
import { useBeneficiaries, useBarangays } from '../api/hooks';
import {
  Search, Users, ChevronDown, MapPin, Phone, Building2,
  ArrowLeft, ChevronRight, Filter, Beef, List, Map,
} from 'lucide-react';
import BeneficiaryDetailModal from '../components/BeneficiaryDetailModal';
import StatusBadge from '../components/ui/StatusBadge';

// ---------------------------------------------------------------------------
// District grouping for LGU drill-down
// ---------------------------------------------------------------------------
const DISTRICTS = {
  '1st District (Northern)': [
    'Canlaon City', 'Guihulngan City', 'Ayungon', 'Bindoy', 'Jimalalud',
    'La Libertad', 'Manjuyod', 'Tayasan', 'Vallehermoso',
  ],
  '2nd District (Central)': [
    'Bais City', 'Dumaguete City', 'Tanjay City', 'Amlan', 'Mabinay',
    'Pamplona', 'San Jose', 'Sibulan',
  ],
  '3rd District (Southern)': [
    'Bayawan City', 'Bacong', 'Basay', 'Dauin', 'Santa Catalina',
    'Siaton', 'Valencia', 'Zamboanguita',
  ],
};

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------
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

function LGUSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}

function BarangaySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
    </div>
  );
}

function BeneficiaryTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function BeneficiariesPage() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'location'

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Beneficiaries</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View and manage registered beneficiaries
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
            activeTab === 'list'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <List className="h-4 w-4" />
          All Beneficiaries
        </button>
        <button
          onClick={() => setActiveTab('location')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
            activeTab === 'location'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Map className="h-4 w-4" />
          Browse by Location
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && <AllBeneficiariesView />}
      {activeTab === 'location' && <LocationDrillDownView />}
    </div>
  );
}

// ===========================================================================
// Tab 1 — All Beneficiaries (existing card grid with filters)
// ===========================================================================
function AllBeneficiariesView() {
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
              className="appearance-none w-full sm:w-56 pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all cursor-pointer"
              aria-label="Filter by barangay"
            >
              <option value="">All Barangays</option>
              {(() => {
                // Group barangays by city/municipality, sorted alphabetically
                const grouped = {};
                if (barangays?.results) {
                  for (const b of barangays.results) {
                    if (!grouped[b.city_municipality]) grouped[b.city_municipality] = [];
                    grouped[b.city_municipality].push(b);
                  }
                }
                const sortedCities = Object.keys(grouped).sort();
                return sortedCities.map((city) => (
                  <optgroup key={city} label={city}>
                    {grouped[city]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                  </optgroup>
                ));
              })()}
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
            </div>
          ))
        )}
      </div>

      {selectedBeneficiaryId && (
        <BeneficiaryDetailModal beneficiaryId={selectedBeneficiaryId} onClose={() => setSelectedBeneficiaryId(null)} />
      )}
    </div>
  );
}

// ===========================================================================
// Tab 2 — Browse by Location (LGU → Barangay → Beneficiaries)
// ===========================================================================
function LocationDrillDownView() {
  const [level, setLevel] = useState(1);
  const [selectedLGU, setSelectedLGU] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [lguSearch, setLguSearch] = useState('');
  const [brgySearch, setBrgySearch] = useState('');

  // Fetch all barangays
  const { data: brgyData, isLoading: brgyLoading } = useBarangays();
  const allBarangays = brgyData?.results || [];

  // Group by LGU
  const lguMap = useMemo(() => {
    const map = {};
    for (const b of allBarangays) {
      if (!map[b.city_municipality]) map[b.city_municipality] = [];
      map[b.city_municipality].push(b);
    }
    for (const lgu of Object.keys(map)) {
      map[lgu].sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [allBarangays]);

  const lguBarangays = useMemo(() => {
    if (!selectedLGU) return [];
    return lguMap[selectedLGU] || [];
  }, [selectedLGU, lguMap]);

  // Fetch beneficiaries for selected barangay
  const { data: benData, isLoading: benLoading } = useBeneficiaries(
    level === 3 && selectedBarangay ? { barangay: selectedBarangay.id } : null
  );
  const beneficiaries = benData?.results || [];

  // Beneficiary counts from API
  const beneficiaryCounts = useMemo(() => {
    const counts = {};
    for (const b of allBarangays) {
      counts[b.id] = b.beneficiary_count || 0;
    }
    return counts;
  }, [allBarangays]);

  // Handlers
  const goToList = () => { setLevel(1); setSelectedLGU(null); setSelectedBarangay(null); setLguSearch(''); setBrgySearch(''); };
  const goToBarangays = (lgu) => { setSelectedLGU(lgu); setLevel(2); setBrgySearch(''); };
  const goToBeneficiaries = (brgy) => { setSelectedBarangay(brgy); setLevel(3); };
  const backToBarangays = () => { setLevel(2); setSelectedBarangay(null); };

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <button onClick={goToList} className={`font-medium transition-colors ${level === 1 ? 'text-slate-700' : 'text-green-600 hover:text-green-700'}`}>
          All LGUs
        </button>
        {level >= 2 && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <button onClick={level === 3 ? backToBarangays : undefined} className={`font-medium transition-colors ${level === 3 ? 'text-green-600 hover:text-green-700' : 'text-slate-700'}`}>
              {selectedLGU}
            </button>
          </>
        )}
        {level === 3 && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span className="font-medium text-slate-700">{selectedBarangay?.name}</span>
          </>
        )}
      </nav>

      {/* ── Level 1: LGU List ── */}
      {level === 1 && (
        <div className="space-y-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={lguSearch}
              onChange={(e) => setLguSearch(e.target.value)}
              placeholder="Search LGU..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
            />
          </div>
          {brgyLoading ? <LGUSkeleton /> : Object.entries(DISTRICTS).map(([district, lgus]) => {
            const visible = lgus.filter((l) => l.toLowerCase().includes(lguSearch.toLowerCase()));
            if (!visible.length) return null;
            return (
              <div key={district}>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{district}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visible.map((lgu) => {
                    const count = (lguMap[lgu] || []).length;
                    const bCount = (lguMap[lgu] || []).reduce((sum, b) => sum + (b.beneficiary_count || 0), 0);
                    const isCity = lgu.includes('City');
                    return (
                      <button key={lgu} onClick={() => goToBarangays(lgu)}
                        className="group text-left p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:border-green-300/60 hover:shadow-md transition-all duration-200 stagger-item">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCity ? 'bg-gradient-to-br from-blue-500 to-indigo-500' : 'bg-gradient-to-br from-green-500 to-emerald-500'}`}>
                              <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-900 group-hover:text-green-700 transition-colors">{lgu}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{count} barangays · {bCount} beneficiaries</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-green-500 transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Level 2: Barangay List ── */}
      {level === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={goToList} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{selectedLGU}</h2>
              <p className="text-sm text-slate-500">{lguBarangays.length} barangays</p>
            </div>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input value={brgySearch} onChange={(e) => setBrgySearch(e.target.value)} placeholder="Search barangay..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none" />
          </div>
          {brgyLoading ? <BarangaySkeleton /> : (() => {
            const filtered = lguBarangays.filter((b) => b.name.toLowerCase().includes(brgySearch.toLowerCase()));
            if (!filtered.length) return <div className="text-center py-10"><MapPin className="h-8 w-8 text-slate-200 mx-auto mb-2" /><p className="text-sm text-slate-500">No barangays match</p></div>;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((brgy) => {
                  const bCount = beneficiaryCounts[brgy.id] || 0;
                  return (
                    <button key={brgy.id} onClick={() => goToBeneficiaries(brgy)}
                      className="group text-left p-3.5 bg-white rounded-xl border border-slate-200/60 shadow-sm hover:border-green-300/60 hover:shadow-md transition-all duration-200 stagger-item">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate group-hover:text-green-700 transition-colors">{brgy.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{bCount} {bCount === 1 ? 'beneficiary' : 'beneficiaries'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bCount > 0 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-300'}`}>
                            <Users className="h-3.5 w-3.5" />
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-green-500 transition-colors" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Level 3: Beneficiary List ── */}
      {level === 3 && (
        <BeneficiaryTable
          lguName={selectedLGU}
          barangayName={selectedBarangay?.name}
          beneficiaries={beneficiaries}
          isLoading={benLoading}
          onBack={backToBarangays}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Level 3 — Beneficiary Table (reused inside drill-down)
// ===========================================================================
function BeneficiaryTable({ lguName, barangayName, beneficiaries, isLoading, onBack }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const filtered = beneficiaries.filter((b) => {
    const matchSearch = b.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.contact_number && b.contact_number.includes(search));
    const matchStatus = !statusFilter ||
      (statusFilter === 'active' && b.is_active_beneficiary) ||
      (statusFilter === 'inactive' && !b.is_active_beneficiary);
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{barangayName}</h2>
          <p className="text-sm text-slate-500">{lguName} · {isLoading ? 'Loading...' : `${beneficiaries.length} beneficiaries`}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or contact..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none cursor-pointer">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? <BeneficiaryTableSkeleton /> : beneficiaries.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">No beneficiaries found</p>
          <p className="text-xs text-slate-400">No beneficiaries are registered in {barangayName} yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <Search className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No results match your search</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Animals</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Registered</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors stagger-item">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {b.full_name?.[0] || 'B'}
                        </div>
                        <p className="font-medium text-slate-900 truncate">{b.full_name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{b.contact_number || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5">
                      {b.current_animal_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                          <Beef className="h-3 w-3" />{b.current_animal_count}
                        </span>
                      ) : <span className="text-xs text-slate-300">0</span>}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.is_active_beneficiary ? 'true' : 'false'} /></td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{b.date_registered}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setSelectedId(b.id)} className="text-green-600 hover:text-green-700 font-medium text-xs hover:underline transition-colors">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-slate-200/60 p-4 hover:border-green-300/60 transition-colors stagger-item">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {b.full_name?.[0] || 'B'}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900">{b.full_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{b.contact_number || 'No contact'}</p>
                    </div>
                  </div>
                  <StatusBadge status={b.is_active_beneficiary ? 'true' : 'false'} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Beef className="h-3 w-3" />{b.current_animal_count} animals
                  </span>
                  <button onClick={() => setSelectedId(b.id)} className="text-green-600 font-medium text-xs">View</button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400">Showing {filtered.length} of {beneficiaries.length}</p>
        </>
      )}

      {selectedId && <BeneficiaryDetailModal beneficiaryId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
