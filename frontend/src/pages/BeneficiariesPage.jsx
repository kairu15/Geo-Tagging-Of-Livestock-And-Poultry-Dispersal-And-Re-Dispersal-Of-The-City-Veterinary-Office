import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBeneficiaries, useBarangays } from '../api/hooks';
import { Plus, Search, Users, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BeneficiariesPage() {
  const [search, setSearch] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { isOfficerOrAbove } = useAuth();

  const params = {};
  if (search) params.search = search;
  if (barangayFilter) params.barangay = barangayFilter;
  if (statusFilter) params.is_active_beneficiary = statusFilter;

  const { data, isLoading } = useBeneficiaries(params);
  const { data: barangays } = useBarangays();

  const beneficiaries = data?.results || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beneficiaries</h1>
          <p className="text-sm text-gray-500">{data?.count || 0} registered beneficiaries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or contact..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={barangayFilter}
              onChange={(e) => setBarangayFilter(e.target.value)}
              className="appearance-none w-full sm:w-48 px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Barangays</option>
              {barangays?.results?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full sm:w-40 px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-gray-400">Loading...</div>
        ) : beneficiaries.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No beneficiaries found</p>
          </div>
        ) : (
          beneficiaries.map((b) => (
            <Link
              key={b.id}
              to={`/beneficiaries/${b.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{b.full_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{b.barangay_name}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  b.is_active_beneficiary ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {b.is_active_beneficiary ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <span>{b.contact_number || 'No contact'}</span>
                <span className="font-medium text-green-600">
                  {b.current_animal_count} animals held
                </span>
              </div>
              {b.latitude && b.longitude && (
                <p className="text-xs text-gray-400 mt-2">
                  📍 {Number(b.latitude).toFixed(4)}, {Number(b.longitude).toFixed(4)}
                </p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
