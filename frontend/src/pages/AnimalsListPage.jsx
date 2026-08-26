import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnimals, useSpecies } from '../api/hooks';
import { Plus, Search, Filter, Beef, ChevronDown } from 'lucide-react';
import AnimalDetailModal from '../components/AnimalDetailModal';

const statusColors = {
  AVAILABLE: 'bg-green-100 text-green-800',
  DISPERSED: 'bg-blue-100 text-blue-800',
  RETURNED_TO_CVO: 'bg-yellow-100 text-yellow-800',
  DECEASED: 'bg-red-100 text-red-800',
  UNDER_RE_DISPERSAL_REVIEW: 'bg-purple-100 text-purple-800',
  CULLED: 'bg-gray-100 text-gray-800',
  SOLD_WITH_APPROVAL: 'bg-orange-100 text-orange-800',
};

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

  const animals = data?.results || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Animals</h1>
          <p className="text-sm text-gray-500">{data?.count || 0} total animals</p>
        </div>
        <Link
          to="/animals/register"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Register Animal
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tag ID or color..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full sm:w-48 px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="DISPERSED">Dispersed</option>
              <option value="RETURNED_TO_CVO">Returned to CVO</option>
              <option value="DECEASED">Deceased</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="appearance-none w-full sm:w-40 px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Species</option>
              {speciesList?.results?.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : animals.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Beef className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No animals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Tag ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Species</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Sex</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Owner</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Batch</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {animals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {animal.tag_id}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{animal.species_name}</td>
                    <td className="px-4 py-3 text-gray-700">{animal.sex}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {animal.current_owner_name || <span className="text-gray-400 italic">CVO Custody</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[animal.current_status] || 'bg-gray-100 text-gray-800'}`}>
                        {animal.current_status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {animal.is_batch ? `${animal.batch_quantity} heads` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedAnimalId(animal.id)}
                        className="text-green-600 hover:text-green-800 font-medium text-xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data?.count > 20 && (
        <div className="text-center text-sm text-gray-500">
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
