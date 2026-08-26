import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Tag, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { useTagAnimal, useAnimals, useCaretakers, useBarangays } from '../api/hooks';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function TagAnimalPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [useExistingCaretaker, setUseExistingCaretaker] = useState(true);
  const [success, setSuccess] = useState(null);

  const tagAnimal = useTagAnimal();
  const { data: animalsData } = useAnimals({ current_status: 'AVAILABLE' });
  const { data: caretakersData } = useCaretakers();
  const { data: barangaysData } = useBarangays();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const availableAnimals = animalsData?.results || [];
  const caretakers = caretakersData?.results || [];

  const onSubmit = async (data) => {
    try {
      const payload = {
        animal_id: parseInt(data.animal_id),
        tag_type: data.tag_type,
        intake_condition: data.intake_condition || 'HEALTHY',
        latitude: position ? position[0] : null,
        longitude: position ? position[1] : null,
      };

      if (useExistingCaretaker && data.caretaker_id) {
        payload.caretaker_id = parseInt(data.caretaker_id);
      } else {
        payload.caretaker_full_name = data.caretaker_full_name;
        payload.caretaker_contact = data.caretaker_contact || '';
        payload.caretaker_barangay_id = data.caretaker_barangay ? parseInt(data.caretaker_barangay) : null;
        payload.caretaker_address = data.caretaker_address || '';
        payload.caretaker_type = data.caretaker_type || 'FORMAL_BENEFICIARY';
      }

      const result = await tagAnimal.mutateAsync(payload);
      setSuccess(result);
    } catch (err) {
      // Error handled by mutation
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Animal Tagged Successfully!</h2>
          <p className="text-gray-600 mb-1">
            Tag Code: <span className="font-mono font-bold">{success.tag_code}</span>
          </p>
          <p className="text-gray-600 mb-6">
            Animal: <span className="font-medium">{success.animal_tag}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/geo-tracking/profile/${success.id}`)}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              View Geo-Profile
            </button>
            <button
              onClick={() => {
                setSuccess(null);
                setPosition(null);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Tag Another
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
          <Tag className="h-6 w-6 text-green-600" />
          Register New Geo-Tag
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Assign a geo-tag to an animal and set its first caretaker
        </p>
      </div>

      {tagAnimal.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {tagAnimal.error.response?.data?.error || 'Failed to tag animal. Please try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Animal Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Animal & Tag Info
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Animal *</label>
              <select
                {...register('animal_id', { required: 'Select an animal' })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                <option value="">Select available animal...</option>
                {availableAnimals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag_id} — {a.species_name}
                  </option>
                ))}
              </select>
              {errors.animal_id && (
                <p className="text-red-500 text-xs mt-1">{errors.animal_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag Type *</label>
              <select
                {...register('tag_type', { required: 'Select tag type' })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                <option value="EAR_TAG">Ear Tag</option>
                <option value="LEG_BAND">Leg Band</option>
                <option value="QR_ONLY">QR Only</option>
                <option value="GPS_COLLAR">GPS Collar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intake Condition</label>
              <select
                {...register('intake_condition')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                <option value="HEALTHY">Healthy</option>
                <option value="SICK">Sick</option>
                <option value="INJURED">Injured</option>
                <option value="UNDERWEIGHT">Underweight</option>
              </select>
            </div>
          </div>
        </div>

        {/* Caretaker Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Initial Caretaker
          </h2>

          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => setUseExistingCaretaker(true)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                useExistingCaretaker
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              Existing Caretaker
            </button>
            <button
              type="button"
              onClick={() => setUseExistingCaretaker(false)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                !useExistingCaretaker
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              New Caretaker
            </button>
          </div>

          {useExistingCaretaker ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caretaker *</label>
              <select
                {...register('caretaker_id', {
                  required: useExistingCaretaker ? 'Select a caretaker' : false,
                })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                <option value="">Select caretaker...</option>
                {caretakers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.caretaker_type_display})
                  </option>
                ))}
              </select>
              {errors.caretaker_id && (
                <p className="text-red-500 text-xs mt-1">{errors.caretaker_id.message}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  {...register('caretaker_full_name', {
                    required: !useExistingCaretaker ? 'Name is required' : false,
                  })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Enter caretaker name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input
                  {...register('caretaker_contact')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="09XX XXX XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caretaker Type</label>
                <select
                  {...register('caretaker_type')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  <option value="FORMAL_BENEFICIARY">Formal Beneficiary</option>
                  <option value="INFORMAL_CARETAKER">Informal Caretaker</option>
                  <option value="TEMPORARY_FOSTER">Temporary Foster</option>
                  <option value="CVO_HOLDING_FACILITY">CVO Facility</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
                <select
                  {...register('caretaker_barangay')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  <option value="">Select barangay...</option>
                  {barangaysData?.results?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  {...register('caretaker_address')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Full address"
                />
              </div>
            </div>
          )}
        </div>

        {/* Location Pin */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-600" />
            Pin Location
          </h2>
          <p className="text-xs text-gray-400 mb-4">Click on the map to set the tagging location</p>
          <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden' }}>
            <MapContainer
              center={[9.6894, 122.8353]}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker position={position} setPosition={setPosition} />
            </MapContainer>
          </div>
          {position && (
            <p className="text-xs text-gray-500 mt-2">
              Selected: {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </p>
          )}
        </div>

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
            disabled={tagAnimal.isPending}
            className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {tagAnimal.isPending ? 'Tagging...' : 'Register Tag'}
          </button>
        </div>
      </form>
    </div>
  );
}
