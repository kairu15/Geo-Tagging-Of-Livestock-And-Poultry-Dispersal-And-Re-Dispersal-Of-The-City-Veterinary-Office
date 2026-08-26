import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBarangays, useBeneficiaries } from '../api/hooks';
import {
  MapPin, ChevronRight, ChevronDown, Search, Users, Beef,
  Building2, ArrowLeft, Phone, Calendar, Filter, X,
} from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import SpeciesIcon from '../components/ui/SpeciesIcon';
import BeneficiaryDetailModal from '../components/BeneficiaryDetailModal';

// ---------------------------------------------------------------------------
// District grouping
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
// Skeleton loaders
// ---------------------------------------------------------------------------
function LGUSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="skeleton h-24 rounded-2xl" />
      ))}
    </div>
  );
}

function BarangaySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="skeleton h-16 rounded-xl" />
      ))}
    </div>
  );
}

function BeneficiarySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton h-20 rounded-xl" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------
function Breadcrumbs({ items }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap" aria-label="Breadcrumb">
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-700 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Level 1 — LGU Cards
// ---------------------------------------------------------------------------
function LGUListView({ lguCounts, onSelectLGU, isLoading }) {
  const [search, setSearch] = useState('');

  if (isLoading) return <LGUSkeleton />;

  const filtered = (lgus) =>
    lgus.filter((lgu) =>
      lgu.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search LGU..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all"
          aria-label="Search LGUs"
        />
      </div>

      {/* Districts */}
      {Object.entries(DISTRICTS).map(([district, lgus]) => {
        const visible = filtered(lgus);
        if (visible.length === 0) return null;
        return (
          <div key={district}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {district}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visible.map((lgu) => {
                const count = lguCounts[lgu] || 0;
                const isCity = lgu.includes('City');
                return (
                  <button
                    key={lgu}
                    onClick={() => onSelectLGU(lgu)}
                    className="group text-left p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:border-green-300/60 hover:shadow-md transition-all duration-200 stagger-item"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isCity
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                            : 'bg-gradient-to-br from-green-500 to-emerald-500'
                        }`}>
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 group-hover:text-green-700 transition-colors">
                            {lgu}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {isCity ? 'City' : 'Municipality'} · {count} barangays
                          </p>
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
  );
}

// ---------------------------------------------------------------------------
// Level 2 — Barangay List
// ---------------------------------------------------------------------------
function BarangayListView({ lguName, barangays, onSelectBarangay, onBack, beneficiaryCounts }) {
  const [search, setSearch] = useState('');

  const filtered = barangays.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back to LGUs"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{lguName}</h2>
          </div>
          <p className="text-sm text-slate-500 ml-11">
            {barangays.length} barangays · Click one to view beneficiaries
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search barangay..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all"
          aria-label="Search barangays"
        />
      </div>

      {/* Barangay grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No barangays match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((brgy) => {
            const bCount = beneficiaryCounts[brgy.id] || 0;
            return (
              <button
                key={brgy.id}
                onClick={() => onSelectBarangay(brgy)}
                className="group text-left p-3.5 bg-white rounded-xl border border-slate-200/60 shadow-sm hover:border-green-300/60 hover:shadow-md transition-all duration-200 stagger-item"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate group-hover:text-green-700 transition-colors">
                      {brgy.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {bCount} {bCount === 1 ? 'beneficiary' : 'beneficiaries'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      bCount > 0
                        ? 'bg-green-50 text-green-600'
                        : 'bg-slate-50 text-slate-300'
                    }`}>
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-green-500 transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level 3 — Beneficiary List
// ---------------------------------------------------------------------------
function BeneficiaryListView({ lguName, barangayName, beneficiaries, isLoading, onBack, onBackToLGU }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const filtered = beneficiaries.filter((b) => {
    const matchesSearch =
      b.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.contact_number && b.contact_number.includes(search));
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'active' && b.is_active_beneficiary) ||
      (statusFilter === 'inactive' && !b.is_active_beneficiary);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Back to barangays"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{barangayName}</h2>
            <p className="text-sm text-slate-500">
              {lguName} · {isLoading ? 'Loading...' : `${beneficiaries.length} registered beneficiaries`}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none cursor-pointer"
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <BeneficiarySkeleton />
      ) : beneficiaries.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">No beneficiaries found</p>
          <p className="text-xs text-slate-400">
            No beneficiaries are registered in {barangayName} yet.
          </p>
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
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Animals Held</th>
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
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{b.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {b.contact_number || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {b.current_animal_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                          <Beef className="h-3 w-3" />
                          {b.current_animal_count}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={b.is_active_beneficiary ? 'true' : 'false'} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {b.date_registered}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedId(b.id)}
                        className="text-green-600 hover:text-green-700 font-medium text-xs hover:underline transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-slate-200/60 p-4 hover:border-green-300/60 transition-colors stagger-item"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {b.full_name?.[0] || 'B'}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900">{b.full_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {b.contact_number || 'No contact'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={b.is_active_beneficiary ? 'true' : 'false'} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Beef className="h-3 w-3" />
                      {b.current_animal_count} animals
                    </span>
                    <span>Reg: {b.date_registered}</span>
                  </div>
                  <button
                    onClick={() => setSelectedId(b.id)}
                    className="text-green-600 font-medium text-xs"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Count */}
          <p className="text-center text-xs text-slate-400">
            Showing {filtered.length} of {beneficiaries.length} beneficiaries
          </p>
        </>
      )}

      {/* Detail Modal */}
      {selectedId && (
        <BeneficiaryDetailModal
          beneficiaryId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function LGUBarangayPage() {
  const [level, setLevel] = useState(1); // 1=LGU, 2=Barangay, 3=Beneficiary
  const [selectedLGU, setSelectedLGU] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);

  // Fetch all barangays
  const { data: brgyData, isLoading: brgyLoading } = useBarangays();
  const allBarangays = brgyData?.results || [];

  // Group barangays by LGU
  const lguMap = useMemo(() => {
    const map = {};
    for (const b of allBarangays) {
      if (!map[b.city_municipality]) map[b.city_municipality] = [];
      map[b.city_municipality].push(b);
    }
    // Sort barangays within each LGU
    for (const lgu of Object.keys(map)) {
      map[lgu].sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [allBarangays]);

  // Get barangays for selected LGU
  const lguBarangays = useMemo(() => {
    if (!selectedLGU) return [];
    return lguMap[selectedLGU] || [];
  }, [selectedLGU, lguMap]);

  // Fetch beneficiaries for selected barangay
  const { data: benData, isLoading: benLoading } = useBeneficiaries(
    selectedBarangay ? { barangay: selectedBarangay.id } : {}
  );
  const beneficiaries = benData?.results || [];

  // Beneficiary count per barangay for the selected LGU
  const beneficiaryCounts = useMemo(() => {
    const counts = {};
    for (const b of allBarangays) {
      counts[b.id] = 0; // Will be populated per-LGU
    }
    return counts;
  }, [allBarangays]);

  // Handlers
  const handleSelectLGU = (lgu) => {
    setSelectedLGU(lgu);
    setLevel(2);
  };

  const handleSelectBarangay = (brgy) => {
    setSelectedBarangay(brgy);
    setLevel(3);
  };

  const handleBackToLGUs = () => {
    setLevel(1);
    setSelectedLGU(null);
    setSelectedBarangay(null);
  };

  const handleBackToBarangays = () => {
    setLevel(2);
    setSelectedBarangay(null);
  };

  // Breadcrumb items
  const breadcrumbs = [
    { label: 'All LGUs', onClick: level > 1 ? handleBackToLGUs : undefined },
    ...(level >= 2 ? [{ label: selectedLGU, onClick: level === 3 ? handleBackToBarangays : undefined }] : []),
    ...(level === 3 ? [{ label: selectedBarangay?.name }] : []),
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-green-500/20">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          LGU & Barangay Directory
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Browse beneficiaries by location — Negros Oriental
        </p>
      </div>

      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Content */}
      {level === 1 && (
        <LGUListView
          lguCounts={Object.fromEntries(
            Object.entries(lguMap).map(([lgu, brgys]) => [lgu, brgys.length])
          )}
          onSelectLGU={handleSelectLGU}
          isLoading={brgyLoading}
        />
      )}

      {level === 2 && (
        <BarangayListView
          lguName={selectedLGU}
          barangays={lguBarangays}
          onSelectBarangay={handleSelectBarangay}
          onBack={handleBackToLGUs}
          beneficiaryCounts={beneficiaryCounts}
        />
      )}

      {level === 3 && (
        <BeneficiaryListView
          lguName={selectedLGU}
          barangayName={selectedBarangay?.name}
          beneficiaries={beneficiaries}
          isLoading={benLoading}
          onBack={handleBackToBarangays}
          onBackToLGU={handleBackToLGUs}
        />
      )}
    </div>
  );
}
