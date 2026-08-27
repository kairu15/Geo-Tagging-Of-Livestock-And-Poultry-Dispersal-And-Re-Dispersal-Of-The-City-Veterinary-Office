import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAnimals, useBeneficiaries, useTransferReasons, useRedisperseAnimal } from '../api/hooks';
import { useToast } from '../components/ui/Toast';
import { ArrowLeftRight, CheckCircle, AlertCircle, ChevronRight, Beef, Users, FileCheck, ClipboardList, RefreshCw } from 'lucide-react';
import SpeciesIcon from '../components/ui/SpeciesIcon';

function StepIndicator({ currentStep, totalSteps, labels }) {
  return (
    <div className="flex items-center gap-1.5" role="navigation" aria-label="Progress">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
            currentStep > s
              ? 'bg-blue-600 text-white'
              : currentStep === s
                ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                : 'bg-slate-100 text-slate-400'
          }`}>
            {currentStep > s ? <CheckCircle className="h-4 w-4" /> : s}
          </div>
          {s < totalSteps && (
            <div className={`w-6 sm:w-10 h-0.5 rounded-full transition-colors duration-200 ${
              currentStep > s ? 'bg-blue-600' : 'bg-slate-200'
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

export default function RedisperseAnimalPage() {
  const navigate = useNavigate();
  const toast = useToast();
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
      toast.success('Animal re-dispersed successfully!');
      navigate('/animals');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Re-dispersal failed.');
    }
  };

  const handleUseCurrentCoords = () => {
    if (selectedNewBeneficiary?.latitude && selectedNewBeneficiary?.longitude) {
      setValue('latitude', selectedNewBeneficiary.latitude);
      setValue('longitude', selectedNewBeneficiary.longitude);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
            <ArrowLeftRight className="h-5 w-5 text-white" />
          </div>
          Re-Disperse Animal
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Transfer a dispersed animal from one beneficiary to another
        </p>
      </div>

      <StepIndicator
        currentStep={step}
        totalSteps={4}
        labels={['Select Animal', 'Transfer Reason', 'New Beneficiary', 'Confirm']}
      />

      {/* Error display with retry */}
      {redisperseMutation.isError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-sm animate-fade-in" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p>{redisperseMutation.error?.message === 'Network Error' || !navigator.onLine
              ? 'You appear to be offline. Please check your connection and retry.'
              : redisperseMutation.error.response?.data?.error || 'Re-dispersal failed.'}
            </p>
            <button
              type="button"
              onClick={() => redisperseMutation.reset()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Dismiss and retry
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Select Dispersed Animal */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Beef className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Select a Currently Dispersed Animal</h2>
            </div>
            {animalsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
              </div>
            ) : dispersedAnimals.length === 0 ? (
              <div className="text-center py-10">
                <Beef className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">No animals currently dispersed</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dispersedAnimals.map((animal) => (
                  <button
                    type="button"
                    key={animal.id}
                    onClick={() => { setSelectedAnimal(animal); setStep(2); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      selectedAnimal?.id === animal.id
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200/60 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SpeciesIcon species={animal.species_name} size="md" />
                      <div className="min-w-0">
                        <p className="font-mono font-semibold text-sm text-slate-900">{animal.tag_id}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{animal.species_name} · {animal.sex}</p>
                        <p className="text-xs text-blue-600 mt-0.5 font-medium">
                          Current owner: {animal.current_owner_name}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Transfer Reason */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Transfer Reason & Condition</h2>
            </div>

            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/40 flex items-center gap-3">
              <SpeciesIcon species={selectedAnimal?.species_name} size="sm" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Transferring: <span className="font-mono">{selectedAnimal?.tag_id}</span>
                </p>
                <p className="text-xs text-blue-600">
                  Currently held by <span className="font-medium">{selectedAnimal?.current_owner_name}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for Transfer *</label>
              <select
                {...register('end_reason_id', { required: 'Reason is required' })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="">Select a reason...</option>
                {reasons.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.end_reason_id && (
                <p className="text-red-500 text-xs mt-1.5" role="alert">{errors.end_reason_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Animal Condition</label>
                <select
                  {...register('condition_at_transfer')}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none cursor-pointer"
                >
                  <option value="HEALTHY">Healthy</option>
                  <option value="SICK">Sick</option>
                  <option value="INJURED">Injured</option>
                  <option value="PREGNANT">Pregnant</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Offspring Returned</label>
                <input
                  {...register('offspring_count_returned')}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Remarks</label>
              <textarea
                {...register('remarks')}
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none resize-none"
                placeholder="Additional notes about the transfer..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
                Back
              </button>
              <button type="button" onClick={() => setStep(3)} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-medium shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all">
                Next — Select New Beneficiary
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select New Beneficiary */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Select New Beneficiary</h2>
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
                    onClick={() => { setSelectedNewBeneficiary(b); setStep(4); }}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      selectedNewBeneficiary?.id === b.id
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200/60 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <p className="font-medium text-sm text-slate-900">{b.full_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{b.barangay_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{b.current_animal_count} animals currently held</p>
                  </button>
                ))}
              </div>
            )}

            <button type="button" onClick={() => setStep(2)} className="mt-5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              ← Back to reason selection
            </button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <FileCheck className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Confirm Re-Dispersal</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/40">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Animal</p>
                <p className="font-mono font-semibold text-sm text-slate-900 mt-0.5">{selectedAnimal?.tag_id}</p>
                <p className="text-xs text-slate-500">From: {selectedAnimal?.current_owner_name}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Reason</p>
                <p className="font-medium text-sm text-slate-900 mt-0.5">
                  {reasons.find(r => r.id === parseInt(watch('end_reason_id')))?.name}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">To</p>
                <p className="font-medium text-sm text-slate-900 mt-0.5">{selectedNewBeneficiary?.full_name}</p>
                <p className="text-xs text-slate-500">{selectedNewBeneficiary?.barangay_name}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Delivery Location</label>
              <div className="flex gap-2">
                <input {...register('latitude')} placeholder="Latitude" type="number" step="any" className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none" />
                <input {...register('longitude')} placeholder="Longitude" type="number" step="any" className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none" />
                <button type="button" onClick={handleUseCurrentCoords} className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm hover:bg-slate-200 transition-colors font-medium whitespace-nowrap">
                  Use New Owner Location
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Transfer Date</label>
              <input {...register('start_date')} type="date" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(3)} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
                Back
              </button>
              <button
                type="submit"
                disabled={redisperseMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-medium disabled:opacity-50 shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
              >
                {redisperseMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Confirm Re-Dispersal
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
