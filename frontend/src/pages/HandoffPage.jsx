import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRightLeft, CheckCircle, AlertCircle } from 'lucide-react';
import {
  useGeoTags, useCaretakers, useHandoffReasons, useHandoffCustodianship,
  useBarangays,
} from '../api/hooks';
import { useToast } from '../components/ui/Toast';
import MapPicker from '../components/map/MapPicker';

export default function HandoffPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [useExistingCaretaker, setUseExistingCaretaker] = useState(true);
  const [success, setSuccess] = useState(null);

  const toast = useToast();
  const handoff = useHandoffCustodianship();
  const { data: tagsData, isLoading: tagsLoading } = useGeoTags({ is_active: true });
  const { data: caretakersData, isLoading: caretakersLoading } = useCaretakers();
  const { data: reasonsData, isLoading: reasonsLoading } = useHandoffReasons();
  const { data: barangaysData } = useBarangays();

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const selectedTagId = watch('geo_tag_id');

  const activeTags = tagsData?.results || [];
  const caretakers = caretakersData?.results || [];
  const reasons = reasonsData?.results || [];
  const selectedTag = activeTags.find((t) => t.id === parseInt(selectedTagId));

  const onSubmit = async (data) => {
    try {
      const payload = {
        geo_tag_id: parseInt(data.geo_tag_id),
        end_reason_id: parseInt(data.end_reason_id),
        exit_condition: data.exit_condition || 'HEALTHY',
        intake_condition: data.intake_condition || 'HEALTHY',
        latitude: position ? position[0] : null,
        longitude: position ? position[1] : null,
      };

      if (useExistingCaretaker && data.new_caretaker_id) {
        payload.new_caretaker_id = parseInt(data.new_caretaker_id);
      } else {
        payload.caretaker_full_name = data.caretaker_full_name;
        payload.caretaker_contact = data.caretaker_contact || '';
        payload.caretaker_barangay_id = data.caretaker_barangay ? parseInt(data.caretaker_barangay) : null;
        payload.caretaker_address = data.caretaker_address || '';
        payload.caretaker_type = data.caretaker_type || 'INFORMAL_CARETAKER';
      }

      const result = await handoff.mutateAsync(payload);
      setSuccess(result);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Handoff failed.');
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Custodianship Transferred!</h2>
          <p className="text-gray-600 mb-1">
            Tag: <span className="font-mono font-bold">{success.tag_code}</span>
          </p>
          <p className="text-gray-600 mb-6">
            New Custodian: <span className="font-medium">{success.caretaker_name}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/geo-tracking/profile/${success.geo_tag}`)}
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
              Another Handoff
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
          <ArrowRightLeft className="h-6 w-6 text-green-600" />
          Custodianship Handoff
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Transfer an animal's custodianship from one caretaker to another
        </p>
      </div>

      {handoff.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {handoff.error.response?.data?.error || 'Handoff failed. Please try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Animal & Reason */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Transfer Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geo-Tag *</label>
              {tagsLoading ? (
                <div className="skeleton h-10 w-full rounded-lg" />
              ) : (
                <select
                  {...register('geo_tag_id', { required: 'Select a tag' })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  <option value="">Select tagged animal...</option>
                  {activeTags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tag_code} — {t.animal_tag}
                    </option>
                  ))}
                </select>
              )}
              {errors.geo_tag_id && (
                <p className="text-red-500 text-xs mt-1">{errors.geo_tag_id.message}</p>
              )}
              {selectedTag && (
                <p className="text-xs text-gray-400 mt-1">
                  Species: {selectedTag.species_name} | Last check-in: {selectedTag.last_checkin || 'Never'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Handoff Reason *</label>
              {reasonsLoading ? (
                <div className="skeleton h-10 w-full rounded-lg" />
              ) : (
                <select
                  {...register('end_reason_id', { required: 'Select a reason' })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  <option value="">Select reason...</option>
                  {reasons.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.end_reason_id && (
                <p className="text-red-500 text-xs mt-1">{errors.end_reason_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exit Condition</label>
              <select
                {...register('exit_condition')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                <option value="HEALTHY">Healthy</option>
                <option value="SICK">Sick</option>
                <option value="INJURED">Injured</option>
                <option value="UNDERWEIGHT">Underweight</option>
                <option value="DECEASED">Deceased</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intake Condition (New)</label>
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

        {/* New Caretaker */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            New Custodian
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
              <label className="block text-sm font-medium text-gray-700 mb-1">New Caretaker *</label>
              <select
                {...register('new_caretaker_id', {
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
                  <option value="INFORMAL_CARETAKER">Informal Caretaker</option>
                  <option value="FORMAL_BENEFICIARY">Formal Beneficiary</option>
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
        <MapPicker position={position} setPosition={setPosition} label="New Location" hint="Click on the map to set the new custodian's location" />

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
            disabled={handoff.isPending}
            className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {handoff.isPending ? 'Processing...' : 'Complete Handoff'}
          </button>
        </div>
      </form>
    </div>
  );
}
