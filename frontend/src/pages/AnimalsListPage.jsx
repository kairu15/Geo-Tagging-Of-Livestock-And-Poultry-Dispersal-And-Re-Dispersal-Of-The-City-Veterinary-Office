import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnimals, useSpecies } from '../api/hooks';
import { Plus, Search, Beef, ChevronDown } from 'lucide-react';
import AnimalDetailModal from '../components/AnimalDetailModal';
import StatusBadge from '../components/ui/StatusBadge';
import { useAuth } from '../context/AuthContext';

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-4 w-16 rounded hidden sm:block" />
          <div className="skeleton h-4 w-28 rounded hidden md:block" />
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="ml-auto skeleton h-4 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function AnimalsListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);

  const params = {};
  if (search) params.search = search;
  if (statusFilter) params.current_status = statusFilter;
  if (speciesFilter) params.species = speciesFilter;

  const { data, isLoading } = useAnimals(params);
  const { data: speciesList } = useSpecies();
  const { canWrite } = useAuth();

  const animals = data?.results || [];
  const activeFilterCount = [statusFilter, speciesFilter].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Animals</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading ? 'Loading...' : `${data?.count || 0} total animals`}
          </p>
        </div>
        {canWrite ? (
          <Link
            to="/animals/register"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-150 text-sm font-medium shadow-md shadow-green-600/15 hover:shadow-lg hover:shadow-green-600/20"
          >
            <Plus className="h-4 w-4" />
            Register Animal
          </Link>
        ) : (
          <div className="relative group">
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-sm font-medium cursor-not-allowed"
              aria-label="Register Animal (read-only)"
            >
              <Plus className="h-4 w-4" />
              Register Animal
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              View only — contact a Supervisor to register animals
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tag ID or color..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all"
              aria-label="Search animals"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full sm:w-48 pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all cursor-pointer"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="DISPERSED">Dispersed</option>
              <option value="RETURNED_TO_CVO">Returned to CVO</option>
              <option value="DECEASED">Deceased</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="appearance-none w-full sm:w-40 pl-3 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all cursor-pointer"
              aria-label="Filter by species"
            >
              <option value="">All Species</option>
              {speciesList?.results?.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Active filters:</span>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors"
              >
                Status: {statusFilter.replace(/_/g, ' ').toLowerCase()}
                <span className="ml-0.5">×</span>
              </button>
            )}
            {speciesFilter && (
              <button
                onClick={() => setSpeciesFilter('')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                Species: {speciesList?.results?.find((s) => String(s.id) === speciesFilter)?.name}
                <span className="ml-0.5">×</span>
              </button>
            )}
            <button
              onClick={() => { setStatusFilter(''); setSpeciesFilter(''); }}
              className="text-xs text-slate-400 hover:text-slate-600 ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : animals.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Beef className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">No animals found</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {search || statusFilter || speciesFilter
                ? 'Try adjusting your filters or search terms.'
                : 'Register your first animal to get started.'}
            </p>
            {!search && !statusFilter && !speciesFilter && (
              <Link
                to="/animals/register"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Register Animal
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/60">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tag ID</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Species</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sex</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Batch</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {animals.map((animal) => (
                    <tr
                      key={animal.id}
                      className="hover:bg-slate-50/60 transition-colors stagger-item"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900">
                        {animal.tag_id}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{animal.species_name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{animal.sex}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {animal.current_owner_name || <span className="text-slate-400 italic">CVO Custody</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={animal.current_status} />
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {animal.is_batch ? `${animal.batch_quantity} heads` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedAnimalId(animal.id)}
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
            <div className="md:hidden divide-y divide-slate-100">
              {animals.map((animal) => (
                <div
                  key={animal.id}
                  className="p-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-slate-900">{animal.tag_id}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {animal.species_name} · {animal.sex}
                      </p>
                    </div>
                    <StatusBadge status={animal.current_status} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">
                      {animal.current_owner_name || 'CVO Custody'}
                    </span>
                    <button
                      onClick={() => setSelectedAnimalId(animal.id)}
                      className="text-green-600 font-medium text-xs"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination info */}
      {data?.count > 20 && (
        <div className="text-center text-xs text-slate-400 py-1">
          Showing {animals.length} of {data.count} animals
        </div>
      )}

      {/* Detail Modal */}
      {selectedAnimalId && (
        <AnimalDetailModal
          animalId={selectedAnimalId}
          onClose={() => setSelectedAnimalId(null)}
        />
      )}
    </div>
  );
}
