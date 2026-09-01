import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAnimals, useDiseaseTypes, useSubmitDiseaseReport } from '../api/hooks';
import { useToast } from '../components/ui/Toast';
import { useOfflineQueue } from '../api/useOfflineQueue';
import MapPicker from '../components/map/MapPicker';
import {
  Stethoscope, CheckCircle, AlertTriangle, Camera, Loader2,
  WifiOff, RefreshCw, CloudOff,
} from 'lucide-react';

export default function DiseaseReportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const submitReport = useSubmitDiseaseReport();
  const { pendingCount, syncing, syncProgress, enqueue, retryNow } = useOfflineQueue();
  const [position, setPosition] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [success, setSuccess] = useState(false);

  const { data: animalData } = useAnimals({ current_status: 'DISPERSED' });
  const { data: diseaseData } = useDiseaseTypes();

  const animals = animalData?.results || [];
  const diseases = diseaseData?.results || diseaseData || [];

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { event_type: 'DISEASE_SUSPECT', severity: 'MEDIUM' },
  });

  const eventType = watch('event_type');
  const isDiseaseSuspect = eventType === 'DISEASE_SUSPECT';
  const isMortality = eventType === 'MORTALITY';

  const onSubmit = async (data) => {
    if (!position) {
      toast.error('Please tap the map or use GPS to set the location of the report.');
      return;
    }

    const formData = new FormData();
    formData.append('animal_id', data.animal_id);
    formData.append('event_type', data.event_type);
    formData.append('severity', data.severity);
    formData.append('event_date', data.event_date);
    formData.append('latitude', parseFloat(position[0].toFixed(6)));
    formData.append('longitude', parseFloat(position[1].toFixed(6)));
    if (data.disease_suspected_id) formData.append('disease_suspected_id', data.disease_suspected_id);
    if (data.notes) formData.append('notes', data.notes);
    if (photoFile) formData.append('photo', photoFile);

    try {
      await submitReport.mutateAsync(formData);
      setSuccess(true);
    } catch (err) {
      const isNetworkError = err?.message === 'Network Error' || !navigator.onLine;
      if (isNetworkError) {
        await enqueue({
          custodianship_id: 0, // placeholder for health reports
          latitude: parseFloat(position[0].toFixed(6)),
          longitude: parseFloat(position[1].toFixed(6)),
          source: 'DISEASE_REPORT',
          notes: JSON.stringify(data),
          photo: photoFile,
        });
        toast.warning(`You're offline. Report saved to queue. It will sync when you reconnect.`);
      } else {
        toast.error(err.response?.data?.error || 'Report failed. Please try again.');
      }
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 animate-fade-in">
        <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
          <p className="text-gray-600 mb-6">
            The health event has been recorded and is under review.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => { setSuccess(false); setPosition(null); setPhotoFile(null); }}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Submit Another
            </button>
            <button
              onClick={() => navigate('/health/events')}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              View All Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-red-500" />
          Report Sick or Dead Animal
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Report health events for disease surveillance and outbreak response
        </p>
      </div>

      {/* Offline queue banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {syncing ? (
                <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
              ) : navigator.onLine ? (
                <RefreshCw className="h-5 w-5 text-amber-600" />
              ) : (
                <CloudOff className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                {syncing
                  ? `Syncing queued reports...${syncProgress ? ` (${syncProgress.current}/${syncProgress.total})` : ''}`
                  : `${pendingCount} report${pendingCount !== 1 ? 's' : ''} queued for sync`
                }
              </p>
              {!syncing && navigator.onLine && (
                <button type="button" onClick={retryNow}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900">
                  <RefreshCw className="h-3 w-3" /> Sync now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!navigator.onLine && pendingCount === 0 && (
        <div className="flex items-center gap-2 p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-sm">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          You're offline. Reports will be queued and synced when you reconnect.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Animal Selection */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-50 flex items-center justify-center">
              <Stethoscope className="h-3.5 w-3.5 text-red-500" />
            </div>
            Animal & Event Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Animal *</label>
              <select
                {...register('animal_id', { required: 'Select an animal' })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none cursor-pointer"
              >
                <option value="">Select animal...</option>
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag_id} — {a.species_name} ({a.current_owner_name || 'Unknown'})
                  </option>
                ))}
              </select>
              {errors.animal_id && <p className="text-red-500 text-xs mt-1">{errors.animal_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Event Type *</label>
              <select
                {...register('event_type')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none cursor-pointer"
              >
                <option value="DISEASE_SUSPECT">🦠 Disease Suspect Report</option>
                <option value="ILLNESS">🤒 Illness Report</option>
                <option value="MORTALITY">💀 Mortality</option>
                <option value="VACCINATION">💉 Vaccination</option>
                <option value="DEWORMING">💊 Deworming</option>
                <option value="TREATMENT">🩹 Treatment</option>
                <option value="INSPECTION">🔍 Inspection</option>
              </select>
            </div>

            {isDiseaseSuspect && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Suspected Disease</label>
                <select
                  {...register('disease_suspected_id')}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none cursor-pointer"
                >
                  <option value="">Select disease...</option>
                  {diseases.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Severity *</label>
              <select
                {...register('severity')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none cursor-pointer"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
              <input
                {...register('event_date', { required: 'Date is required' })}
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none"
              />
              {errors.event_date && <p className="text-red-500 text-xs mt-1">{errors.event_date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Photo</label>
              <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                <Camera className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">{photoFile ? photoFile.name : 'Take photo...'}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files[0])} />
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none resize-none"
              placeholder={isMortality ? "Cause of death, conditions observed..." : "Symptoms, condition details, observations..."}
            />
          </div>
        </div>

        {/* Location */}
        <MapPicker
          position={position}
          setPosition={setPosition}
          label="Report Location"
          hint="Pin the location where the health event was observed"
        />

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitReport.isPending}
            className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-50 shadow-md shadow-red-500/20 flex items-center gap-2"
          >
            {submitReport.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              <><Stethoscope className="h-4 w-4" /> Submit Report</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
