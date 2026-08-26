import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAnimals, useBeneficiaries, useDisperseAnimal } from '../api/hooks';
import { useToast } from '../components/ui/Toast';
import { Handshake, CheckCircle, AlertCircle, ChevronRight, Beef, Users, FileCheck } from 'lucide-react';
import SpeciesIcon from '../components/ui/SpeciesIcon';

function StepIndicator({ currentStep, totalSteps, steps, labels }) {
  return (
    <div className="flex items-center gap-1.5" role="navigation" aria-label="Progress">
      {steps.map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
            currentStep > s
              ? 'bg-green-600 text-white'
              : currentStep === s
                ? 'bg-green-600 text-white ring-4 ring-green-100'
                : 'bg-slate-100 text-slate-400'
          }`}>
            {currentStep > s ? <CheckCircle className="h-4 w-4" /> : s}
          </div>
          {s < totalSteps && (
            <div className={`w-8 sm:w-12 h-0.5 rounded-full transition-colors duration-200 ${
              currentStep > s ? 'bg-green-600' : 'bg-slate-200'
            }`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-sm font-medium text-slate-500 hidden sm:inline">
        {labels[currentStep - 1]}
      </span>
    </div>
  );
}

export default function DisperseAnimalPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const disperseMutation = useDisperseAnimal();
  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      latitude: '',
      longitude: '',
      condition_at_transfer: 'HEALTHY',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

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
      toast.success('Animal dispersed successfully!');
      navigate('/animals');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Dispersal failed. Please try again.');
    }
  };

  const handleMapPin = () => {
    if (selectedBeneficiary?.latitude && selectedBeneficiary?.longitude) {
      setValue('latitude', selectedBeneficiary.latitude);
      setValue('longitude', selectedBeneficiary.longitude);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-green-500/20">
            <Handshake className="h-5 w-5 text-white" />
          </div>
          Disperse Animal
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Assign an available animal to an active beneficiary
        </p>
      </div>

      {/* Step indicators */}
      <StepIndicator
        currentStep={step}
        totalSteps={3}
        steps={[1, 2, 3]}
        labels={['Select Animal', 'Select Beneficiary', 'Confirm Details']}
      />

      {/* Error display */}
      {disperseMutation.isError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-sm animate-fade-in" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{disperseMutation.error.response?.data?.error || 'Dispersal failed. Please try again.'}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Select Animal */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Beef className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Select an Available Animal</h2>
            </div>
            {animalsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
              </div>
            ) : availableAnimals.length === 0 ? (
              <div className="text-center py-10">
                <Beef className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">No available animals for dispersal</p>
                <p className="text-xs text-slate-400 mt-1">Register new animals or check existing statuses</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableAnimals.map((animal) => (
                  <button
                    type="button"
                    key={animal.id}
                    onClick={() => { setSelectedAnimal(animal); setStep(2); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      selectedAnimal?.id === animal.id
                        ? 'border-green-500 bg-green-50/50 shadow-sm'
                        : 'border-slate-200/60 hover:border-green-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SpeciesIcon species={animal.species_name} size="md" />
                      <div className="min-w-0">
                        <p className="font-mono font-semibold text-sm text-slate-900">{animal.tag_id}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {animal.species_name} {animal.breed_name ? `· ${animal.breed_name}` : ''} · {animal.sex}
                        </p>
                        {animal.color_markings && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{animal.color_markings}</p>
                        )}
                        {animal.is_batch && (
                          <p className="text-[11px] text-blue-600 mt-0.5 font-medium">Batch of {animal.batch_quantity} heads</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Beneficiary */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Select a Beneficiary</h2>
            </div>

            {/* Selected animal summary */}
            <div className="mb-5 p-3.5 bg-green-50/60 rounded-xl border border-green-200/40 flex items-center gap-3">
              <SpeciesIcon species={selectedAnimal?.species_name} size="sm" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Dispersing: <span className="font-mono">{selectedAnimal?.tag_id}</span>
                </p>
                <p className="text-xs text-green-600">{selectedAnimal?.species_name}</p>
              </div>
            </div>

            {beneficiariesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeBeneficiaries.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => { setSelectedBeneficiary(b); setStep(3); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      selectedBeneficiary?.id === b.id
                        ? 'border-green-500 bg-green-50/50 shadow-sm'
                        : 'border-slate-200/60 hover:border-green-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <p className="font-medium text-sm text-slate-900">{b.full_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{b.barangay_name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {b.current_animal_count} animals currently held
                    </p>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-5 text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
            >
              ← Back to animal selection
            </button>
          </div>
        )}

        {/* Step 3: Confirm Details */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <FileCheck className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Confirm Dispersal Details</h2>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/40">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Animal</p>
                <p className="font-mono font-semibold text-sm text-slate-900 mt-0.5">{selectedAnimal?.tag_id}</p>
                <p className="text-xs text-slate-500">{selectedAnimal?.species_name}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Beneficiary</p>
                <p className="font-medium text-sm text-slate-900 mt-0.5">{selectedBeneficiary?.full_name}</p>
                <p className="text-xs text-slate-500">{selectedBeneficiary?.barangay_name}</p>
              </div>
            </div>

            {/* Geo-coordinates */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Geo-Coordinates (Optional)</label>
              <div className="flex gap-2">
                <input
                  {...register('latitude')}
                  placeholder="Latitude"
                  type="number"
                  step="any"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                />
                <input
                  {...register('longitude')}
                  placeholder="Longitude"
                  type="number"
                  step="any"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleMapPin}
                  className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm hover:bg-slate-200 transition-colors font-medium whitespace-nowrap"
                >
                  Use Beneficiary Location
                </button>
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Animal Condition</label>
              <select
                {...register('condition_at_transfer')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none cursor-pointer"
              >
                <option value="HEALTHY">Healthy</option>
                <option value="SICK">Sick</option>
                <option value="INJURED">Injured</option>
                <option value="PREGNANT">Pregnant</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Dispersal Date</label>
              <input
                {...register('start_date')}
                type="date"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={disperseMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium disabled:opacity-50 shadow-md shadow-green-600/20 flex items-center justify-center gap-2 transition-all"
              >
                {disperseMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Confirm Dispersal
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
