import { useState } from 'react';
import { useDispersalSummary, useRedispersalFrequency, useSpecies, useBarangays } from '../api/hooks';
import { FileBarChart, Download, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#16a34a', '#2563eb', '#eab308', '#dc2626', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const [filters, setFilters] = useState({});
  const { data: summary, isLoading: summaryLoading } = useDispersalSummary(filters);
  const { data: frequency, isLoading: freqLoading } = useRedispersalFrequency();
  const { data: speciesList } = useSpecies();
  const { data: barangays } = useBarangays();

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <FileBarChart className="h-6 w-6 text-green-600" />
        Reports & Analytics
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="From date"
          />
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="To date"
          />
          <select
            value={filters.species || ''}
            onChange={(e) => handleFilterChange('species', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Species</option>
            {speciesList?.results?.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </select>
          <select
            value={filters.barangay || ''}
            onChange={(e) => handleFilterChange('barangay', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Barangays</option>
            {barangays?.results?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dispersal by Species - Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispersals by Species</h3>
            {summary.by_species?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.by_species}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="animal__species__name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="dispersals" fill="#16a34a" name="Initial Dispersals" />
                  <Bar dataKey="redispersals" fill="#2563eb" name="Re-Dispersals" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No data available.</p>
            )}
          </div>

          {/* Dispersal by Barangay - Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispersals by Barangay</h3>
            {summary.by_barangay?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.by_barangay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="beneficiary__barangay__name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="dispersals" fill="#16a34a" name="Initial Dispersals" />
                  <Bar dataKey="redispersals" fill="#8b5cf6" name="Re-Dispersals" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No data available.</p>
            )}
          </div>
        </div>
      )}

      {/* KPI Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">Total Initial Dispersals</span>
                <span className="text-xl font-bold text-green-700">{summary.total_dispersals}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">Total Re-Dispersals</span>
                <span className="text-xl font-bold text-blue-700">{summary.total_redispersals}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">All Transactions</span>
                <span className="text-xl font-bold text-gray-700">
                  {summary.total_dispersals + summary.total_redispersals}
                </span>
              </div>
            </div>
          </div>

          {/* Most Transferred Animals */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Most Transferred Animals
            </h3>
            {frequency?.most_transferred_animals?.length > 0 ? (
              <div className="space-y-2">
                {frequency.most_transferred_animals.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                    <div>
                      <span className="font-mono text-sm font-medium">{a.tag_id}</span>
                      <span className="text-xs text-gray-500 ml-2">{a.species}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700">{a.transfer_count} transfers</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No multi-transfer cases found.</p>
            )}
          </div>
        </div>
      )}

      {/* Most Active Beneficiaries */}
      {frequency?.most_active_beneficiaries?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Most Active Beneficiaries (Multiple Animals Received)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Barangay</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Animals Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {frequency.most_active_beneficiaries.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{b.name}</td>
                    <td className="px-4 py-2 text-gray-500">{b.barangay}</td>
                    <td className="px-4 py-2 text-right font-bold text-blue-600">{b.total_received}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(summaryLoading || freqLoading) && (
        <div className="text-center text-gray-400 py-4">Loading reports...</div>
      )}
    </div>
  );
}
