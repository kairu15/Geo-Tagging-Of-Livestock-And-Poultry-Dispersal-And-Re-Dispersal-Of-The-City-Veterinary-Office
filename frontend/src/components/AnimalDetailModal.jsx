import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, Calendar, User, ExternalLink } from 'lucide-react';
import { useAnimal, useAnimalHistory } from '../api/hooks';
import StatusBadge from './ui/StatusBadge';
import SpeciesIcon from './ui/SpeciesIcon';

export default function AnimalDetailModal({ animalId, onClose }) {
  const { data: animal, isLoading } = useAnimal(animalId);
  const { data: history } = useAnimalHistory(animalId);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!animalId) return null;

  return createPortal(
    <div data-portal className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-label="Animal details"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Animal Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="skeleton w-20 h-20 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-32 rounded" />
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton h-5 w-20 rounded-full mt-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            </div>
          ) : !animal ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">Animal not found</p>
            </div>
          ) : (
            <>
              {/* Animal header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl border border-slate-200/60">
                  {animal.photo ? (
                    <img src={animal.photo} alt={animal.tag_id} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <SpeciesIcon species={animal.species_name} size="lg" className="!rounded-xl" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-mono font-bold text-slate-900 text-lg leading-tight">{animal.tag_id}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {animal.species_name}{animal.breed_name ? ` · ${animal.breed_name}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={animal.current_status} />
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <DetailItem label="Sex" value={animal.sex} />
                <DetailItem label="Color/Markings" value={animal.color_markings || '—'} />
                <DetailItem label="Weight" value={animal.weight_kg ? `${animal.weight_kg} kg` : '—'} />
                <DetailItem label="Source" value={animal.source || '—'} />
                {animal.is_batch && (
                  <DetailItem label="Batch" value={`${animal.batch_quantity} heads`} />
                )}
                <DetailItem
                  label="Current Owner"
                  value={animal.current_owner_name || 'CVO Custody'}
                  italic={!animal.current_owner_name}
                />
              </div>

              {/* Ownership history */}
              {history && history.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-green-600" />
                    Ownership History
                  </h4>
                  <div className="space-y-2">
                    {history.slice(0, 5).map((record) => (
                      <div
                        key={record.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          record.status === 'ACTIVE'
                            ? 'bg-green-50/60 border-green-200/60'
                            : 'bg-slate-50/60 border-slate-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{record.beneficiary_name}</p>
                            <p className="text-xs text-slate-500">
                              {record.start_date}{record.end_date ? ` – ${record.end_date}` : ' – present'}
                            </p>
                          </div>
                        </div>
                        {record.status === 'ACTIVE' && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                            Current
                          </span>
                        )}
                      </div>
                    ))}
                    {history.length > 5 && (
                      <p className="text-xs text-slate-400 text-center">+{history.length - 5} more records</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Close
          </button>
          {animal && (
            <Link
              to={`/animals/${animal.id}`}
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Full Profile
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DetailItem({ label, value, italic }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/40">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-sm font-medium text-slate-900 mt-0.5 ${italic ? 'italic text-slate-400 font-normal' : ''}`}>
        {value}
      </p>
    </div>
  );
}
