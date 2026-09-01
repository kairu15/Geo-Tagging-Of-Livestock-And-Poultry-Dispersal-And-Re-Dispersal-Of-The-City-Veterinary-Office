import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ClipboardCheck, CheckCircle, AlertCircle, Camera, Maximize2, Minimize2, WifiOff, RefreshCw, CloudOff, Cloud, Loader2 } from 'lucide-react';
import { useCustodianships, useCreateCheckin } from '../api/hooks';
import { useToast } from '../components/ui/Toast';
import { useOfflineQueue } from '../api/useOfflineQueue';
import MapPicker from '../components/map/MapPicker';

export default function CheckInPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [success, setSuccess] = useState(false);

  const toast = useToast();
  const createCheckin = useCreateCheckin();
  const { data: custsData, isLoading: custsLoading } = useCustodianships({ status: 'ACTIVE' });

  const { register, handleSubmit, formState: { errors } } = useForm();

  const activeCustodianships = custsData?.results || [];

  const [mapFullscreen, setMapFullscreen] = useState(false);
  const { pendingCount, syncing, syncProgress, lastSyncResult, enqueue, retryNow } = useOfflineQueue();

  const onSubmit = async (data) => {
    if (!position) {
      toast.error('Please tap the map or use your GPS location to set the check-in point.');
      return;
    }

    const formData = new FormData();
    formData.append('custodianship_id', data.custodianship_id);
    formData.append('latitude', parseFloat(position[0].toFixed(6)));
    formData.append('longitude', parseFloat(position[1].toFixed(6)));
    formData.append('source', data.source || 'FIELD_VISIT');
    if (data.notes) formData.append('notes', data.notes);
    if (photoFile) formData.append('photo', photoFile);

    try {
      await createCheckin.mutateAsync(formData);
      setSuccess(true);
    } catch (err) {
      const isNetworkError = err?.message === 'Network Error' || !navigator.onLine;
      if (isNetworkError) {
        // Queue for later retry
        await enqueue({
          custodianship_id: data.custodianship_id,
          latitude: parseFloat(position[0].toFixed(6)),
          longitude: parseFloat(position[1].toFixed(6)),
          source: data.source || 'FIELD_VISIT',
          notes: data.notes || '',
          photo: photoFile,
        });
        toast.warning(`You're offline. Check-in saved to queue (${pendingCount + 1} pending). It will sync automatically when you reconnect.`);
      } else {
        toast.error(err.response?.data?.error || 'Check-in failed. Please try again.');
      }
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="bg-green-50 rounded-2xl p-8 border border-green-200">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check-in Recorded!</h2>
          <p className="text-gray-600 mb-2">
            Location has been recorded for the active custodianship.
          </p>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 mb-4">
              {pendingCount} queued check-in{pendingCount !== 1 ? 's' : ''} will sync when online.
            </p>
          )}
          <div className="flex gap-3 justify-center flex-wrap">
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
            {pendingCount > 0 && navigator.onLine && (
              <button
                onClick={retryNow}
                disabled={syncing}
                className="px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync Queue ({pendingCount})
              </button>
            )}
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

      {/* Offline queue status banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {syncing ? (
                <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
              ) : navigator.onLine ? (
                <Cloud className="h-5 w-5 text-amber-600" />
              ) : (
                <CloudOff className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                {syncing
                  ? `Syncing queued check-ins...${syncProgress ? ` (${syncProgress.current}/${syncProgress.total})` : ''}`
                  : `${pendingCount} check-in${pendingCount !== 1 ? 's' : ''} queued for sync`
                }
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {!navigator.onLine
                  ? 'You\'re offline. Check-ins will sync when you reconnect.'
                  : lastSyncResult
                    ? `Last sync: ${lastSyncResult.succeeded} succeeded, ${lastSyncResult.failed} failed.`
                    : 'Will sync automatically when online.'
                }
              </p>
              {!syncing && navigator.onLine && (
                <button
                  type="button"
                  onClick={retryNow}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Sync now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {!navigator.onLine && pendingCount === 0 && (
        <div className="flex items-center gap-2 p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-sm">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          You're offline. Check-ins will be queued and synced when you reconnect.
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
            {custsLoading ? (
              <div className="skeleton h-10 w-full rounded-lg" />
            ) : (
              <>
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
                {activeCustodianships.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No active custodianships found.</p>
                )}
              </>
            )}
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
                    capture="environment"
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
        <div className="relative">
          <button
            type="button"
            onClick={() => setMapFullscreen(!mapFullscreen)}
            className="absolute top-3 right-3 z-[9998] flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
            aria-label={mapFullscreen ? 'Exit full-screen map' : 'Full-screen map for precise tapping'}
          >
            {mapFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{mapFullscreen ? 'Exit full-screen' : 'Full-screen'}</span>
          </button>
          <div className={mapFullscreen ? 'fixed inset-0 z-[9997] bg-white' : ''}>
            <MapPicker
              position={position}
              setPosition={setPosition}
              className={mapFullscreen ? 'h-full flex flex-col' : ''}
            />
          </div>
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
            disabled={createCheckin.isPending}
            className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createCheckin.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Recording...
              </>
            ) : 'Record Check-in'}
          </button>
        </div>
      </form>
    </div>
  );
}
