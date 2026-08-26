import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAnimals, useBeneficiaries, useTransferReasons, useRedisperseAnimal } from '../api/hooks';
import { ArrowLeftRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function RedisperseAnimalPage() {
  const navigate = useNavigate();
  const redisperseMutation = useRedisperseAnimal();
  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [selectedNewBeneficiary, setSelectedNewBeneficiary] = useState(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      end_reason_id: '',
      latitude: '',
      longitude: '',
      condition_at_transfer: 'HEALTHY',
      remarks: '',
      offspring_count_returned: 0,
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch dispersed animals
  const { data: animalData, isLoading: animalsLoading } = useAnimals({ current_status: 'DISPERSED' });
  const { data: beneficiaryData, isLoading: beneficiariesLoading } = useBeneficiaries({ is_active_beneficiary: 'true' });
  const { data: reasonsData } = useTransferReasons();

  const dispersedAnimals = animalData?.results || [];
  const activeBeneficiaries = beneficiaryData?.results || [];
  const reasons = reasonsData?.results || reasonsData || [];

  const onSubmit = async (data) => {
    if (!selectedAnimal || !selectedNewBeneficiary) return;

    try {
      await redisperseMutation.mutateAsync({
        animal_id: selectedAnimal.id,
        new_beneficiary_id: selectedNewBeneficiary.id,
        end_reason_id: parseInt(data.end_reason_id),
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        condition_at_transfer: data.condition_at_transfer,
        remarks: data.remarks,
        offspring_count_returned: parseInt(data.offspring_count_returned) || 0,
        start_date: data.start_date,
      });
      navigate('/animals');
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleUseCurrentCoords = () => {
    if (selectedNewBeneficiary?.latitude && selectedNewBeneficiary?.longitude) {
      setValue('latitude', selectedNewBeneficiary.latitude);
      setValue('longitude', selectedNewBeneficiary.longitude);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <ArrowLeftRight className="h-6 w-6 text-blue-600" />
        Re-Disperse Animal
      </h1>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? <CheckCircle className="h-5 w-5" /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-gray-500">
          {step === 1 ? 'Select Animal' : step === 2 ? 'Transfer Reason' : step === 3 ? 'New Beneficiary' : 'Confirm'}
        </span>
      </div>

      {/* Error display */}
      {redisperseMutation.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          {redisperseMutation.error.response?.data?.error || 'Re-dispersal failed.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Select Dispersed Animal */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Select a Currently Dispersed Animal</h2>
            {animalsLoading ? (
              <p className="text-gray-400">Loading dispersed animals...</p>
            ) : dispersedAnimals.length === 0 ? (
              <p className="text-gray-400">No animals currently dispersed.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dispersedAnimals.map((animal) => (
                  <button
                    type="button"
                    key={animal.id}
                    onClick={() => { setSelectedAnimal(animal); setStep(2); }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedAnimal?.id === animal.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-mono font-medium text-gray-900">{animal.tag_id}</p>
                    <p className="text-sm text-gray-500">{animal.species_name} — {animal.sex}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Current owner: {animal.current_owner_name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Transfer Reason */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Transfer Reason & Condition</h2>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Transferring: <span className="font-mono font-medium">{selectedAnimal?.tag_id}</span>
                {' — currently held by '}<span className="font-medium">{selectedAnimal?.current_owner_name}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Transfer</label>
              <select
                {...register('end_reason_id', { required: 'Reason is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select a reason...</option>
                {reasons.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.end_reason_id && (
                <p className="text-red-500 text-xs mt-1">{errors.end_reason_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Animal Condition at Transfer</label>
              <select
                {...register('condition_at_transfer')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="HEALTHY">Healthy</option>
                <option value="SICK">Sick</option>
                <option value="INJURED">Injured</option>
                <option value="PREGNANT">Pregnant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offspring Returned (for Paiwi obligation)</label>
              <input
                {...register('offspring_count_returned')}
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                {...register('remarks')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Additional notes about the transfer..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                Back
              </button>
              <button type="button" onClick={() => setStep(3)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                Next — Select New Beneficiary
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select New Beneficiary */}
        {step === 3 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Select New Beneficiary</h2>

            {beneficiariesLoading ? (
              <p className="text-gray-400">Loading beneficiaries...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeBeneficiaries.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => { setSelectedNewBeneficiary(b); setStep(4); }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedNewBeneficiary?.id === b.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{b.full_name}</p>
                    <p className="text-sm text-gray-500">{b.barangay_name}</p>
                    <p className="text-xs text-gray-400 mt-1">{b.current_animal_count} animals currently held</p>
                  </button>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setStep(2)} className="mt-4 text-sm text-gray-500 hover:text-gray-900">
              ← Back to reason selection
            </button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Confirm Re-Dispersal</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-400">Animal</p>
                <p className="font-mono font-medium">{selectedAnimal?.tag_id}</p>
                <p className="text-sm text-gray-500">From: {selectedAnimal?.current_owner_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Reason</p>
                <p className="font-medium">{reasons.find(r => r.id === parseInt(watch('end_reason_id')))?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">To</p>
                <p className="font-medium">{selectedNewBeneficiary?.full_name}</p>
                <p className="text-sm text-gray-500">{selectedNewBeneficiary?.barangay_name}</p>
              </div>
            </div>

            {/* Geo-coordinates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Delivery Location</label>
              <div className="flex gap-3">
                <input
                  {...register('latitude')}
                  placeholder="Latitude"
                  type="number"
                  step="any"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  {...register('longitude')}
                  placeholder="Longitude"
                  type="number"
                  step="any"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={handleUseCurrentCoords}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                >
                  Use New Owner Location
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Date</label>
              <input {...register('start_date')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setStep(3)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                Back
              </button>
              <button
                type="submit"
                disabled={redisperseMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                {redisperseMutation.isPending ? 'Processing...' : 'Confirm Re-Dispersal'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
