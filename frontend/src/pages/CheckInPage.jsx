import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ClipboardCheck, MapPin, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { useCustodianships, useCreateCheckin } from '../api/hooks';
import { useToast } from '../components/ui/Toast';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const BAYAWAN_CENTER = [122.8353, 9.6894];

export default function CheckInPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [success, setSuccess] = useState(false);

  const toast = useToast();
  const createCheckin = useCreateCheckin();
  const { data: custsData } = useCustodianships({ status: 'ACTIVE' });

  const { register, handleSubmit, formState: { errors } } = useForm();

  const activeCustodianships = custsData?.results || [];

  const onSubmit = async (data) => {
    if (!position) {
      alert('Please click on the map to set the location.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('custodianship_id', data.custodianship_id);
      formData.append('latitude', position[0]);
      formData.append('longitude', position[1]);
      formData.append('source', data.source || 'FIELD_VISIT');
      if (data.notes) formData.append('notes', data.notes);
      if (photoFile) formData.append('photo', photoFile);

      await createCheckin.mutateAsync(formData);
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed.');
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check-in Recorded!</h2>
          <p className="text-gray-600 mb-6">
            Location has been recorded for the active custodianship.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(false);
                setPosition(null);
                setPhotoFile(null);
              }}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Another Check-in
            </button>
            <button
              onClick={() => navigate('/geo-tracking/map')}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-green-600" />
          Location Check-in
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Record a location update for an active custodianship (no custody change)
        </p>
      </div>

      {createCheckin.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {createCheckin.error.response?.data?.error || 'Check-in failed. Please try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Custodianship Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Select Custodianship
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Active Custodianship *</label>
            <select
              {...register('custodianship_id', { required: 'Select a custodianship' })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            >
              <option value="">Select active custodianship...</option>
              {activeCustodianships.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tag_code} — {c.animal_tag} → {c.caretaker_name} (since {c.start_date})
                </option>
              ))}
            </select>
            {errors.custodianship_id && (
              <p className="text-red-500 text-xs mt-1">{errors.custodianship_id.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select
                {...register('source')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                <option value="FIELD_VISIT">Field Visit</option>
                <option value="MANUAL_UPDATE">Manual Update</option>
                <option value="GPS_DEVICE">GPS Device</option>
                <option value="CITIZEN_REPORT">Citizen Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">
                    {photoFile ? photoFile.name : 'Choose photo...'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
              placeholder="Field notes, observations, condition details..."
            />
          </div>
        </div>

        {/* Location Pin */}
        <MapPicker position={position} setPosition={setPosition} />

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createCheckin.isPending}
            className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createCheckin.isPending ? 'Recording...' : 'Record Check-in'}
          </button>
        </div>
      </form>
    </div>
  );
}

function MapPicker({ position, setPosition }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: { 'osm': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
        layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
      },
      center: position || BAYAWAN_CENTER,
      zoom: 12,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-left');
    mapRef.current = map;

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setPosition([lat, lng]);
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new maplibregl.Marker({ color: '#16a34a' })
        .setLngLat([lng, lat])
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-green-600" />
        Current Location
      </h2>
      <p className="text-xs text-gray-400 mb-4">Click on the map to set the check-in location</p>
      <div ref={mapContainer} style={{ height: '300px', borderRadius: '12px', overflow: 'hidden' }} />
      {position && (
        <p className="text-xs text-gray-500 mt-2">
          Selected: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </p>
      )}
    </div>
  );
}