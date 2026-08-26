import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X, MapPin, Phone, Mail, FileText, ExternalLink,
  Beef, Calendar, Home, UserCheck,
} from 'lucide-react';
import { useBeneficiary, useBeneficiaryCurrentHoldings } from '../api/hooks';

const speciesEmoji = {
  Goat: '🐐', Cattle: '🐄', Swine: '🐖', Chicken: '🐔', Duck: '🦆',
};

export default function BeneficiaryDetailModal({ beneficiaryId, onClose }) {
  const { data: beneficiary, isLoading } = useBeneficiary(beneficiaryId);
  const { data: holdings } = useBeneficiaryCurrentHoldings(beneficiaryId);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!beneficiaryId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Beneficiary Profile</h2>
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
          ) : !beneficiary ? (
            <div className="text-center py-12 text-gray-400">
              <p>Beneficiary not found.</p>
            </div>
          ) : (
            <>
              {/* Name & Status */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 font-bold text-lg">
                      {beneficiary.full_name?.[0] || 'B'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">
                      {beneficiary.full_name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {beneficiary.barangay_name}
                      {beneficiary.sitio_purok ? `, ${beneficiary.sitio_purok}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    beneficiary.is_active_beneficiary
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {beneficiary.is_active_beneficiary ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Contact & Info Grid */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <InfoChip icon={Phone} value={beneficiary.contact_number || 'No contact'} />
                <InfoChip icon={Mail} value={beneficiary.email || 'No email'} />
                <InfoChip icon={FileText} value={beneficiary.valid_id_type || 'No ID on file'} />
                <InfoChip icon={Home} value={beneficiary.livelihood_type || '—'} />
                <InfoChip
                  icon={Calendar}
                  value={`Registered ${beneficiary.date_registered}`}
                />
                <InfoChip
                  icon={UserCheck}
                  value={beneficiary.household_head ? 'Household Head' : 'Member'}
                />
              </div>

              {/* Coordinates */}
              {beneficiary.latitude && beneficiary.longitude && (
                <div className="bg-gray-50 rounded-lg p-3 mb-5 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-600">
                    {Number(beneficiary.latitude).toFixed(6)}, {Number(beneficiary.longitude).toFixed(6)}
                  </span>
                </div>
              )}

              {/* Address */}
              {beneficiary.full_address && (
                <p className="text-sm text-gray-500 mb-5">
                  📍 {beneficiary.full_address}
                </p>
              )}

              {/* Current Animal Holdings */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Beef className="h-3.5 w-3.5 text-green-600" />
                  Current Holdings
                  <span className="ml-auto text-xs font-normal text-gray-400 normal-case">
                    {beneficiary.current_animal_count} animals
                  </span>
                </h4>
                {holdings && holdings.length > 0 ? (
                  <div className="space-y-1.5">
                    {holdings.slice(0, 6).map((animal) => (
                      <div
                        key={animal.id}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">
                            {speciesEmoji[animal.species_name] || '🐾'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-medium text-gray-900 truncate">
                              {animal.tag_id}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {animal.species_name}
                              {animal.is_batch ? ` · ${animal.batch_quantity} heads` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {animal.current_status_display}
                        </span>
                      </div>
                    ))}
                    {holdings.length > 6 && (
                      <p className="text-xs text-gray-400 text-center">
                        +{holdings.length - 6} more animals
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No animals currently held.</p>
                )}
              </div>
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
          {beneficiary && (
            <Link
              to={`/beneficiaries/${beneficiary.id}`}
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

function InfoChip({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
      <Icon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}
