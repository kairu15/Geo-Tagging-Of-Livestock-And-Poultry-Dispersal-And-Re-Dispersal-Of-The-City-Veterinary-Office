import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  X, MapPin, Phone, Mail, FileText, ExternalLink,
  Beef, Calendar, Home, UserCheck,
} from 'lucide-react';
import { useBeneficiary, useBeneficiaryCurrentHoldings } from '../api/hooks';
import SpeciesIcon from './ui/SpeciesIcon';

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

  return createPortal(
    <div data-portal className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
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
        aria-label="Beneficiary profile"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Beneficiary Profile</h2>
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
              <div className="flex items-center gap-3">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <div className="skeleton h-5 w-32 rounded" />
                  <div className="skeleton h-3.5 w-24 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
              </div>
            </div>
          ) : !beneficiary ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">Beneficiary not found</p>
            </div>
          ) : (
            <>
              {/* Name & Status */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white font-bold text-lg">
                      {beneficiary.full_name?.[0] || 'B'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{beneficiary.full_name}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {beneficiary.barangay_name}
                      {beneficiary.sitio_purok ? `, ${beneficiary.sitio_purok}` : ''}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  beneficiary.is_active_beneficiary
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {beneficiary.is_active_beneficiary ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Contact & Info Grid */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <InfoChip icon={Phone} value={beneficiary.contact_number || 'No contact'} />
                <InfoChip icon={Mail} value={beneficiary.email || 'No email'} />
                <InfoChip icon={FileText} value={beneficiary.valid_id_type || 'No ID on file'} />
                <InfoChip icon={Home} value={beneficiary.livelihood_type || '—'} />
                <InfoChip icon={Calendar} value={`Registered ${beneficiary.date_registered}`} />
                <InfoChip icon={UserCheck} value={beneficiary.household_head ? 'Household Head' : 'Member'} />
              </div>

              {/* Coordinates */}
              {beneficiary.latitude && beneficiary.longitude && (
                <div className="bg-slate-50 rounded-xl p-3 mb-5 flex items-center gap-2 text-sm border border-slate-200/40">
                  <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-slate-600 font-mono text-xs">
                    {Number(beneficiary.latitude).toFixed(6)}, {Number(beneficiary.longitude).toFixed(6)}
                  </span>
                </div>
              )}

              {/* Address */}
              {beneficiary.full_address && (
                <p className="text-sm text-slate-500 mb-5 flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  {beneficiary.full_address}
                </p>
              )}

              {/* Current Animal Holdings */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Beef className="h-3.5 w-3.5 text-green-600" />
                  Current Holdings
                  <span className="ml-auto text-[11px] font-normal text-slate-400 normal-case">
                    {beneficiary.current_animal_count} animals
                  </span>
                </h4>
                {holdings && holdings.length > 0 ? (
                  <div className="space-y-1.5">
                    {holdings.slice(0, 6).map((animal) => (
                      <div key={animal.id} className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-200/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <SpeciesIcon species={animal.species_name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold text-slate-900 truncate">{animal.tag_id}</p>
                            <p className="text-[11px] text-slate-400">
                              {animal.species_name}
                              {animal.is_batch ? ` · ${animal.batch_quantity} heads` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                          {animal.current_status_display}
                        </span>
                      </div>
                    ))}
                    {holdings.length > 6 && (
                      <p className="text-xs text-slate-400 text-center">+{holdings.length - 6} more animals</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No animals currently held.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
            Close
          </button>
          {beneficiary && (
            <Link
              to={`/beneficiaries/${beneficiary.id}`}
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
    document.body
  );
}

function InfoChip({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-1.5 p-2.5 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-200/40">
      <Icon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
      <span className="truncate text-xs">{value}</span>
    </div>
  );
}
