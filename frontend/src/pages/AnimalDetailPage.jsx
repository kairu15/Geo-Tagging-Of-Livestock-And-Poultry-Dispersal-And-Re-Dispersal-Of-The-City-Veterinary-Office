import { useParams, Link } from 'react-router-dom';
import { useAnimal, useAnimalHistory, useAnimalLocationTimeline } from '../api/hooks';
import { ArrowLeft, MapPin, Calendar, User, Activity } from 'lucide-react';
import LocationTimelineMap from '../components/map/LocationTimelineMap';

const statusColors = {
  AVAILABLE: 'bg-green-100 text-green-800',
  DISPERSED: 'bg-blue-100 text-blue-800',
  RETURNED_TO_CVO: 'bg-yellow-100 text-yellow-800',
  DECEASED: 'bg-red-100 text-red-800',
  UNDER_RE_DISPERSAL_REVIEW: 'bg-purple-100 text-purple-800',
};

export default function AnimalDetailPage() {
  const { id } = useParams();
  const { data: animal, isLoading: animalLoading } = useAnimal(id);
  const { data: history, isLoading: historyLoading } = useAnimalHistory(id);
  const { data: timeline } = useAnimalLocationTimeline(id);

  if (animalLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (!animal) {
    return <div className="text-center text-gray-500 py-8">Animal not found.</div>;
  }

  const timelinePositions = timeline?.timeline?.map((t) => [t.latitude, t.longitude]) || [];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/animals" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to Animals
      </Link>

      {/* Animal Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Photo placeholder */}
          <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            {animal.photo ? (
              <img src={animal.photo} alt={animal.tag_id} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-4xl">
                {animal.species_name === 'Goat' ? '🐐' :
                 animal.species_name === 'Cattle' ? '🐄' :
                 animal.species_name === 'Swine' ? '🐖' :
                 animal.species_name === 'Chicken' ? '🐔' : '🦆'}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 font-mono">{animal.tag_id}</h1>
                <p className="text-sm text-gray-500">{animal.species_name} {animal.breed_name ? `(${animal.breed_name})` : ''}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[animal.current_status] || 'bg-gray-100'}`}>
                {animal.current_status_display}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-400">Sex</p>
                <p className="text-sm font-medium text-gray-900">{animal.sex}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Color/Markings</p>
                <p className="text-sm font-medium text-gray-900">{animal.color_markings || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Weight</p>
                <p className="text-sm font-medium text-gray-900">{animal.weight_kg ? `${animal.weight_kg} kg` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Source</p>
                <p className="text-sm font-medium text-gray-900">{animal.source || '—'}</p>
              </div>
              {animal.is_batch && (
                <div>
                  <p className="text-xs text-gray-400">Batch Quantity</p>
                  <p className="text-sm font-medium text-gray-900">{animal.batch_quantity} heads</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Current Owner</p>
                <p className="text-sm font-medium text-gray-900">
                  {animal.current_owner_name || <span className="text-gray-400 italic">CVO Custody</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ownership History Timeline — the signature feature */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-green-600" />
          Ownership History
        </h2>

        {historyLoading ? (
          <p className="text-gray-400 text-sm">Loading history...</p>
        ) : !history?.length ? (
          <p className="text-gray-400 text-sm">No ownership records yet.</p>
        ) : (
          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />

            {history.map((record, idx) => (
              <div key={record.id} className="relative mb-6 last:mb-0">
                {/* Dot */}
                <div className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 border-white ${
                  record.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'
                }`} />

                <div className={`rounded-lg border p-4 ${
                  record.status === 'ACTIVE'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {record.beneficiary_name}
                        {record.status === 'ACTIVE' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {record.transfer_type_display} — {record.start_date}
                        {record.end_date ? ` to ${record.end_date}` : ' to present'}
                      </p>
                      {record.end_reason_name && (
                        <p className="text-sm text-gray-500 mt-1">
                          Reason: <span className="font-medium">{record.end_reason_name}</span>
                        </p>
                      )}
                      {record.end_remarks && (
                        <p className="text-xs text-gray-400 mt-1 italic">"{record.end_remarks}"</p>
                      )}
                    </div>
                    {record.offspring_count_returned > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {record.offspring_count_returned} offspring returned
                      </span>
                    )}
                  </div>

                  {record.start_latitude && record.start_longitude && (
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {Number(record.start_latitude).toFixed(6)}, {Number(record.start_longitude).toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location Timeline Map */}
      {timelinePositions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Movement Path
            </h2>
            <p className="text-sm text-gray-500">Geo-tagged custody locations over time</p>
          </div>
          <div className="h-[400px]">
            <LocationTimelineMap timeline={timeline.timeline} />
          </div>
        </div>
      )}

      {/* Health Records */}
      {animal.health_records?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Records</h2>
          <div className="space-y-3">
            {animal.health_records.map((hr) => (
              <div key={hr.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">{hr.record_type_display}</span>
                <span className="text-sm text-gray-500">{hr.date}</span>
                {hr.veterinarian_name && (
                  <span className="text-xs text-gray-400">by {hr.veterinarian_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
