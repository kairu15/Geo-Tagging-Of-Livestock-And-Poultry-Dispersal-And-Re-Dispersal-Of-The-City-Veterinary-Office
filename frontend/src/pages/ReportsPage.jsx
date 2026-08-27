import { useState } from 'react';
import { useDispersalSummary, useRedispersalFrequency, useSpecies, useBarangays } from '../api/hooks';
import api from '../api/axios';
import { FileBarChart, Download, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-3 text-xs">
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-slate-600">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-semibold text-slate-900">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [filters, setFilters] = useState({});
  const { data: summary, isLoading: summaryLoading } = useDispersalSummary(filters);
  const { data: frequency, isLoading: freqLoading } = useRedispersalFrequency();
  const { data: speciesList } = useSpecies();
  const { data: barangays } = useBarangays();

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.species) params.set('species', filters.species);
      if (filters.barangay) params.set('barangay', filters.barangay);

      const res = await api.get(`/reports/dispersal-export/?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'dispersal_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-green-500/20">
              <FileBarChart className="h-5 w-5 text-white" />
            </div>
            Reports & Analytics
          </h1>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200/60 rounded-xl hover:bg-green-100 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
            aria-label="From date"
          />
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
            aria-label="To date"
          />
          <select
            value={filters.species || ''}
            onChange={(e) => handleFilterChange('species', e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none cursor-pointer"
            aria-label="Filter by species"
          >
            <option value="">All Species</option>
            {speciesList?.results?.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </select>
          <select
            value={filters.barangay || ''}
            onChange={(e) => handleFilterChange('barangay', e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none cursor-pointer"
            aria-label="Filter by barangay"
          >
            <option value="">All Barangays</option>
            {barangays?.results?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-600" />
              Dispersals by Species
            </h3>
            {summary.by_species?.length > 0 ? (
              <div className="overflow-x-auto -mx-2 px-2">
                <ResponsiveContainer width="100%" height={300} minWidth={Math.max(summary.by_species.length * 80, 280)}>
                  <BarChart data={summary.by_species} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="animal__species__name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={summary.by_species.length > 4 ? -30 : 0} textAnchor={summary.by_species.length > 4 ? 'end' : 'middle'} height={summary.by_species.length > 4 ? 60 : 30} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="dispersals" fill="#16a34a" name="Initial Dispersals" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="redispersals" fill="#2563eb" name="Re-Dispersals" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">No data available</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Dispersals by Barangay
            </h3>
            {summary.by_barangay?.length > 0 ? (
              <div className="overflow-x-auto -mx-2 px-2">
                <ResponsiveContainer width="100%" height={300} minWidth={Math.max(summary.by_barangay.length * 80, 280)}>
                  <BarChart data={summary.by_barangay} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="beneficiary__barangay__name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={summary.by_barangay.length > 3 ? -45 : 0} textAnchor={summary.by_barangay.length > 3 ? 'end' : 'middle'} height={summary.by_barangay.length > 3 ? 70 : 30} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="dispersals" fill="#16a34a" name="Initial Dispersals" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="redispersals" fill="#8b5cf6" name="Re-Dispersals" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">No data available</p>
            )}
          </div>
        </div>
      )}

      {/* KPI Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Overall Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100/60">
                <span className="text-sm font-medium text-emerald-700">Total Initial Dispersals</span>
                <span className="text-xl font-bold text-emerald-700">{summary.total_dispersals}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/60">
                <span className="text-sm font-medium text-blue-700">Total Re-Dispersals</span>
                <span className="text-xl font-bold text-blue-700">{summary.total_redispersals}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-200/60">
                <span className="text-sm font-medium text-slate-700">All Transactions</span>
                <span className="text-xl font-bold text-slate-700">
                  {summary.total_dispersals + summary.total_redispersals}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Most Transferred Animals
            </h3>
            {frequency?.most_transferred_animals?.length > 0 ? (
              <div className="space-y-2">
                {frequency.most_transferred_animals.slice(0, 5).map((a, idx) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-100/40">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-mono text-sm font-semibold text-slate-900">{a.tag_id}</span>
                        <span className="text-xs text-slate-500 ml-2">{a.species}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-700">{a.transfer_count} transfers</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-6">No multi-transfer cases found</p>
            )}
          </div>
        </div>
      )}

      {/* Most Active Beneficiaries */}
      {frequency?.most_active_beneficiaries?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Most Active Beneficiaries
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Barangay</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Animals Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {frequency.most_active_beneficiaries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">{b.name}</td>
                    <td className="px-5 py-3 text-slate-500">{b.barangay}</td>
                    <td className="px-5 py-3 text-right font-bold text-blue-600">{b.total_received}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(summaryLoading || freqLoading) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <div className="skeleton h-4 w-32 rounded mb-4" />
              <div className="skeleton h-[250px] rounded-xl" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
