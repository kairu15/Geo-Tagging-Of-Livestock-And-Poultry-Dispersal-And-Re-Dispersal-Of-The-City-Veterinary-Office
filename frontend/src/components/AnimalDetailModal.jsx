import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, MapPin, Calendar, User, ExternalLink } from 'lucide-react';
import { useAnimal, useAnimalHistory } from '../api/hooks';

const statusColors = {
  AVAILABLE: 'bg-green-100 text-green-800',
  DISPERSED: 'bg-blue-100 text-blue-800',
  RETURNED_TO_CVO: 'bg-yellow-100 text-yellow-800',
  DECEASED: 'bg-red-100 text-red-800',
  UNDER_RE_DISPERSAL_REVIEW: 'bg-purple-100 text-purple-800',
  CULLED: 'bg-gray-100 text-gray-800',
  SOLD_WITH_APPROVAL: 'bg-orange-100 text-orange-800',
};

const speciesEmoji = {
  Goat: '🐐',
  Cattle: '🐄',
  Swine: '🐖',
  Chicken: '🐔',
  Duck: '🦆',
};

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Animal Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : !animal ? (
            <div className="text-center py-12 text-gray-400">
              <p>Animal not found.</p>
            </div>
          ) : (
            <>
              {/* Animal header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl">
                  {animal.photo ? (
                    <img
                      src={animal.photo}
                      alt={animal.tag_id}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    speciesEmoji[animal.species_name] || '🐾'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-mono font-bold text-gray-900 text-lg leading-tight">
                        {animal.tag_id}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {animal.species_name}
                        {animal.breed_name ? ` · ${animal.breed_name}` : ''}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        statusColors[animal.current_status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {animal.current_status_display}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
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
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-green-600" />
                    Ownership History
                  </h4>
                  <div className="space-y-2">
                    {history.slice(0, 5).map((record) => (
                      <div
                        key={record.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          record.status === 'ACTIVE'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {record.beneficiary_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.start_date}
                              {record.end_date ? ` – ${record.end_date}` : ' – present'}
                            </p>
                          </div>
                        </div>
                        {record.status === 'ACTIVE' && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            Current
                          </span>
                        )}
                      </div>
                    ))}
                    {history.length > 5 && (
                      <p className="text-xs text-gray-400 text-center">
                        +{history.length - 5} more records
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
          {animal && (
            <Link
              to={`/animals/${animal.id}`}
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Full Profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, italic }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-medium text-gray-900 mt-0.5 ${italic ? 'italic text-gray-400 font-normal' : ''}`}>
        {value}
      </p>
    </div>
  );
}
