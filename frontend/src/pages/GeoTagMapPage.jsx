import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Filter, RefreshCw } from 'lucide-react';
import LiveTrackingMapLayer from '../components/geo/LiveTrackingMapLayer';
import { useSpecies, useBarangays } from '../api/hooks';

export default function GeoTagMapPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const { data: species } = useSpecies();
  const { data: barangays } = useBarangays();

  const handleFeatureClick = (props, type) => {
    if (type === 'geo' && props.geo_tag_id) {
      navigate(`/geo-tracking/profile/${props.geo_tag_id}`);
    } else if (type === 'dispersal' && props.id) {
      navigate(`/animals/${props.id}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-green-600" />
            Live Tracking Map
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time view of all geo-tagged animal locations and custodianship status
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Species</label>
            <select
              value={filters.species || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  species: e.target.value || undefined,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            >
              <option value="">All Species</option>
              {species?.results?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Barangay</label>
            <select
              value={filters.barangay || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  barangay: e.target.value || undefined,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            >
              <option value="">All Barangays</option>
              {barangays?.results?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Caretaker Type</label>
            <select
              value={filters.caretaker_type || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  caretaker_type: e.target.value || undefined,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            >
              <option value="">All Types</option>
              <option value="FORMAL_BENEFICIARY">Formal Beneficiary</option>
              <option value="INFORMAL_CARETAKER">Informal Caretaker</option>
              <option value="TEMPORARY_FOSTER">Temporary Foster</option>
              <option value="CVO_HOLDING_FACILITY">CVO Facility</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <LiveTrackingMapLayer
          filters={filters}
          height="calc(100vh - 300px)"
          onFeatureClick={handleFeatureClick}
        />
      </div>
    </div>
  );
}
