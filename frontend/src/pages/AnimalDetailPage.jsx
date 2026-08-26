import { useParams, Link } from 'react-router-dom';
import { useAnimal, useAnimalHistory, useAnimalLocationTimeline } from '../api/hooks';
import { ArrowLeft, MapPin, Calendar, User, Activity, Beef } from 'lucide-react';
import LocationTimelineMap from '../components/map/LocationTimelineMap';
import StatusBadge from '../components/ui/StatusBadge';
import SpeciesIcon from '../components/ui/SpeciesIcon';

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="skeleton h-5 w-32 rounded" />
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="skeleton w-32 h-32 rounded-xl" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-7 w-40 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="skeleton h-3 w-16 rounded" />
                  <div className="skeleton h-4 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
        <div className="skeleton h-5 w-48 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnimalDetailPage() {
  const { id } = useParams();
  const { data: animal, isLoading: animalLoading } = useAnimal(id);
  const { data: history, isLoading: historyLoading } = useAnimalHistory(id);
  const { data: timeline } = useAnimalLocationTimeline(id);

  if (animalLoading) return <DetailSkeleton />;

  if (!animal) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Beef className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-600">Animal not found</p>
        <Link to="/animals" className="text-sm text-green-600 hover:text-green-700 mt-2 inline-block">Back to Animals</Link>
      </div>
    );
  }

  const timelinePositions = timeline?.timeline?.map((t) => [t.latitude, t.longitude]) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link
        to="/animals"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Animals
      </Link>

      {/* Animal Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Photo / Emoji */}
            <div className="w-32 h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-200/60">
              {animal.photo ? (
                <img src={animal.photo} alt={animal.tag_id} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <SpeciesIcon species={animal.species_name} size="xl" className="!rounded-2xl" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">{animal.tag_id}</h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {animal.species_name} {animal.breed_name ? `· ${animal.breed_name}` : ''}
                  </p>
                </div>
                <StatusBadge status={animal.current_status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mt-5">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Sex</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{animal.sex}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Color / Markings</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{animal.color_markings || <span className="text-slate-300">—</span>}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Weight</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{animal.weight_kg ? `${animal.weight_kg} kg` : <span className="text-slate-300">—</span>}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Source</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{animal.source || <span className="text-slate-300">—</span>}</p>
                </div>
                {animal.is_batch && (
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Batch Quantity</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{animal.batch_quantity} heads</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Current Owner</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {animal.current_owner_name || <span className="text-slate-400 italic">CVO Custody</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ownership History Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
          <Calendar className="h-4.5 w-4.5 text-green-600" />
          Ownership History
        </h2>

        {historyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : !history?.length ? (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No ownership records yet</p>
          </div>
        ) : (
          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-green-300 via-slate-200 to-slate-200" />

            {history.map((record) => (
              <div key={record.id} className="relative mb-5 last:mb-0 stagger-item">
                {/* Dot */}
                <div className={`absolute -left-[21px] top-3.5 w-[14px] h-[14px] rounded-full border-[3px] border-white shadow-sm ${
                  record.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'
                }`} />

                <div className={`rounded-xl border p-4 transition-colors ${
                  record.status === 'ACTIVE'
                    ? 'border-green-200/60 bg-green-50/50'
                    : 'border-slate-200/60 bg-white hover:bg-slate-50/50'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{record.beneficiary_name}</span>
                        {record.status === 'ACTIVE' && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {record.transfer_type_display} · {record.start_date}
                        {record.end_date ? ` to ${record.end_date}` : ' to present'}
                      </p>
                      {record.end_reason_name && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          Reason: <span className="font-medium text-slate-700">{record.end_reason_name}</span>
                        </p>
                      )}
                      {record.end_remarks && (
                        <p className="text-xs text-slate-400 mt-1 italic">"{record.end_remarks}"</p>
                      )}
                    </div>
                    {record.offspring_count_returned > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium flex-shrink-0">
                        {record.offspring_count_returned} offspring
                      </span>
                    )}
                  </div>

                  {record.start_latitude && record.start_longitude && (
                    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
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
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-blue-600" />
              Movement Path
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Geo-tagged custody locations over time</p>
          </div>
          <div className="h-[400px]">
            <LocationTimelineMap timeline={timeline.timeline} />
          </div>
        </div>
      )}

      {/* Health Records */}
      {animal.health_records?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Health Records</h2>
          <div className="space-y-2">
            {animal.health_records.map((hr) => (
              <div key={hr.id} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200/60 flex-shrink-0">
                  <Activity className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800">{hr.record_type_display}</span>
                  <span className="text-sm text-slate-500 ml-2">{hr.date}</span>
                </div>
                {hr.veterinarian_name && (
                  <span className="text-xs text-slate-400">by {hr.veterinarian_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
