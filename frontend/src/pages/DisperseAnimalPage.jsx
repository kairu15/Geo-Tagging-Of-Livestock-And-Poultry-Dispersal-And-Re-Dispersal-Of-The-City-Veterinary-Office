import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAnimals, useBeneficiaries, useDisperseAnimal } from '../api/hooks';
import { Handshake, CheckCircle, AlertCircle } from 'lucide-react';

export default function DisperseAnimalPage() {
  const navigate = useNavigate();
  const disperseMutation = useDisperseAnimal();
  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      latitude: '',
      longitude: '',
      condition_at_transfer: 'HEALTHY',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch available animals
  const { data: animalData, isLoading: animalsLoading } = useAnimals({ current_status: 'AVAILABLE' });
  const { data: beneficiaryData, isLoading: beneficiariesLoading } = useBeneficiaries({ is_active_beneficiary: 'true' });

  const availableAnimals = animalData?.results || [];
  const activeBeneficiaries = beneficiaryData?.results || [];

  const onSubmit = async (data) => {
    if (!selectedAnimal || !selectedBeneficiary) return;

    try {
      await disperseMutation.mutateAsync({
        animal_id: selectedAnimal.id,
        beneficiary_id: selectedBeneficiary.id,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        condition_at_transfer: data.condition_at_transfer,
        start_date: data.start_date,
      });
      navigate('/animals');
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleMapPin = () => {
    // Use beneficiary's coordinates as default if available
    if (selectedBeneficiary?.latitude && selectedBeneficiary?.longitude) {
      setValue('latitude', selectedBeneficiary.latitude);
      setValue('longitude', selectedBeneficiary.longitude);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Handshake className="h-6 w-6 text-green-600" />
        Disperse Animal
      </h1>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? <CheckCircle className="h-5 w-5" /> : s}
            </div>
            {s < 3 && <div className={`w-16 h-0.5 ${step > s ? 'bg-green-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-gray-500">
          {step === 1 ? 'Select Animal' : step === 2 ? 'Select Beneficiary' : 'Confirm Details'}
        </span>
      </div>

      {/* Error display */}
      {disperseMutation.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          {disperseMutation.error.response?.data?.error || 'Dispersal failed. Please try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Select Animal */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Select an Available Animal</h2>
            {animalsLoading ? (
              <p className="text-gray-400">Loading available animals...</p>
            ) : availableAnimals.length === 0 ? (
              <p className="text-gray-400">No available animals for dispersal.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableAnimals.map((animal) => (
                  <button
                    type="button"
                    key={animal.id}
                    onClick={() => { setSelectedAnimal(animal); setStep(2); }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedAnimal?.id === animal.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-mono font-medium text-gray-900">{animal.tag_id}</p>
                    <p className="text-sm text-gray-500">
                      {animal.species_name} {animal.breed_name ? `(${animal.breed_name})` : ''} — {animal.sex}
                    </p>
                    {animal.is_batch && (
                      <p className="text-xs text-blue-600 mt-1">Batch of {animal.batch_quantity} heads</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{animal.color_markings}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Beneficiary */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Select a Beneficiary</h2>

            {/* Selected animal summary */}
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                Dispersing: <span className="font-mono font-medium">{selectedAnimal?.tag_id}</span>
                {' — '}{selectedAnimal?.species_name}
              </p>
            </div>

            {beneficiariesLoading ? (
              <p className="text-gray-400">Loading beneficiaries...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeBeneficiaries.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => { setSelectedBeneficiary(b); setStep(3); }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedBeneficiary?.id === b.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{b.full_name}</p>
                    <p className="text-sm text-gray-500">{b.barangay_name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {b.current_animal_count} animals currently held
                    </p>
                  </button>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setStep(1)} className="mt-4 text-sm text-gray-500 hover:text-gray-900">
              ← Back to animal selection
            </button>
          </div>
        )}

        {/* Step 3: Confirm Details */}
        {step === 3 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Confirm Dispersal Details</h2>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-400">Animal</p>
                <p className="font-mono font-medium">{selectedAnimal?.tag_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Beneficiary</p>
                <p className="font-medium">{selectedBeneficiary?.full_name}</p>
              </div>
            </div>

            {/* Geo-coordinates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geo-Coordinates (Optional)</label>
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
                  onClick={handleMapPin}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                >
                  Use Beneficiary Location
                </button>
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Animal Condition</label>
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

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dispersal Date</label>
              <input
                {...register('start_date')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={disperseMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                {disperseMutation.isPending ? 'Processing...' : 'Confirm Dispersal'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
