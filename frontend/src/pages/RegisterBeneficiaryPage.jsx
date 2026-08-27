import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useCreateBeneficiary, useBarangays } from '../api/hooks';
import { useToast } from '../components/ui/Toast';
import MapPicker from '../components/map/MapPicker';
import {
  Users, ArrowLeft, CheckCircle, AlertCircle, Shield, FileText,
  Phone, UserCheck, Loader2,
} from 'lucide-react';

const ID_TYPES = [
  'PhilSys ID (National ID)',
  'Voter\'s ID',
  'Barangay Certificate',
  'Drivers License',
  'SSS ID',
  'PhilHealth ID',
  'TIN ID',
  'Postal ID',
  'Other',
];

const LIVELIHOOD_TYPES = [
  'Farming',
  'Livestock Raising',
  'Fishing',
  'Small Business',
  'Manufacturing',
  'Service Industry',
  'Government Employee',
  'Other',
];

export default function RegisterBeneficiaryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const createMutation = useCreateBeneficiary();
  const [position, setPosition] = useState(null);
  const [idImageFile, setIdImageFile] = useState(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      household_head: false,
      privacy_consent_given: false,
    },
  });

  const privacyConsent = watch('privacy_consent_given');
  const { data: barangaysData, isLoading: barangaysLoading } = useBarangays();

  const barangays = barangaysData?.results || [];

  const onSubmit = async (data) => {
    if (!data.privacy_consent_given) {
      toast.error('Privacy consent is required to register a beneficiary.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('first_name', data.first_name);
      if (data.middle_name) formData.append('middle_name', data.middle_name);
      formData.append('last_name', data.last_name);
      if (data.suffix) formData.append('suffix', data.suffix);
      if (data.contact_number) formData.append('contact_number', data.contact_number);
      if (data.email) formData.append('email', data.email);
      formData.append('barangay', data.barangay);
      if (data.sitio_purok) formData.append('sitio_purok', data.sitio_purok);
      if (data.full_address) formData.append('full_address', data.full_address);
      if (data.valid_id_type) formData.append('valid_id_type', data.valid_id_type);
      if (data.valid_id_number) formData.append('valid_id_number', data.valid_id_number);
      formData.append('household_head', data.household_head ? 'true' : 'false');
      if (data.livelihood_type) formData.append('livelihood_type', data.livelihood_type);
      if (position) {
        formData.append('latitude', position[0]);
        formData.append('longitude', position[1]);
      }
      formData.append('privacy_consent_given', 'true');
      if (idImageFile) formData.append('id_image', idImageFile);

      const result = await createMutation.mutateAsync(formData);
      toast.success('Beneficiary registered successfully!');
      navigate(`/beneficiaries/${result.data.id}`);
    } catch (err) {
      const msg = err?.response?.data;
      if (typeof msg === 'object' && msg !== null) {
        const firstError = Object.entries(msg)[0];
        if (firstError) {
          toast.error(`${firstError[0]}: ${Array.isArray(firstError[1]) ? firstError[1][0] : firstError[1]}`);
          return;
        }
      }
      toast.error(msg?.detail || msg?.error || 'Registration failed. Please check your inputs.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link
        to="/beneficiaries"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Beneficiaries
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-green-500/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          Register Beneficiary
        </h1>
        <p className="text-sm text-slate-500 mt-1 ml-[52px]">
          Register a new livestock program beneficiary
        </p>
      </div>

      {createMutation.isError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-sm animate-fade-in" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{createMutation.error?.response?.data?.detail || 'Registration failed. Please check your inputs.'}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label>
              <input
                {...register('first_name', { required: 'First name is required' })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                placeholder="Juan"
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Middle Name</label>
              <input
                {...register('middle_name')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                placeholder="Santos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label>
              <input
                {...register('last_name', { required: 'Last name is required' })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                placeholder="Dela Cruz"
              />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Suffix</label>
              <input
                {...register('suffix')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                placeholder="Jr., Sr., III"
              />
            </div>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Phone className="h-4 w-4 text-green-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Contact & Address</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Number</label>
              <input
                {...register('contact_number')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                placeholder="09XX XXX XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                placeholder="email@example.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Barangay *</label>
              {barangaysLoading ? (
                <div className="skeleton h-10 w-full rounded-xl" />
              ) : (
                <select
                  {...register('barangay', { required: 'Barangay is required' })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none cursor-pointer"
                >
                  <option value="">Select barangay...</option>
                  {barangays.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}, {b.city_municipality}</option>
                  ))}
                </select>
              )}
              {errors.barangay && <p className="text-red-500 text-xs mt-1">{errors.barangay.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sitio / Purok</label>
              <input
                {...register('sitio_purok')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                placeholder="Sitio / Purok"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Livelihood Type</label>
              <select
                {...register('livelihood_type')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none cursor-pointer"
              >
                <option value="">Select livelihood...</option>
                {LIVELIHOOD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Address</label>
              <input
                {...register('full_address')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                placeholder="House number, street, etc."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/40">
            <input
              type="checkbox"
              {...register('household_head')}
              id="household_head"
              className="h-4 w-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
            />
            <label htmlFor="household_head" className="text-sm text-slate-700">
              This person is the household head
            </label>
          </div>
        </div>

        {/* ID Verification */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">ID Verification</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Valid ID Type</label>
              <select
                {...register('valid_id_type')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none cursor-pointer"
              >
                <option value="">Select ID type...</option>
                {ID_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ID Number</label>
              <input
                {...register('valid_id_number')}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
                placeholder="ID number"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ID Photo</label>
              <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-xl text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">
                  {idImageFile ? idImageFile.name : 'Upload a photo of the valid ID...'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setIdImageFile(e.target.files[0])}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Location */}
        <MapPicker
          position={position}
          setPosition={setPosition}
          label="Farm / Home Location"
          hint="Pin the beneficiary's farm or home location on the map"
        />

        {/* Privacy Consent (RA 10173) */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Shield className="h-4 w-4 text-amber-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Data Privacy Consent</h2>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200/40">
            <p className="text-xs text-slate-600 leading-relaxed">
              In compliance with the <strong>Philippine Data Privacy Act of 2012 (Republic Act No. 10173)</strong>,
              the City Veterinary Office collects and processes your personal information for the purpose of
              livestock program management, animal dispersal tracking, and beneficiary services. Your data
              will be treated with confidentiality and will only be used for authorized CVO operations.
              You have the right to access, correct, or request deletion of your personal data.
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/40">
            <input
              type="checkbox"
              {...register('privacy_consent_given', { required: true })}
              id="privacy_consent"
              className="h-4 w-4 text-green-600 border-slate-300 rounded focus:ring-green-500 mt-0.5"
            />
            <label htmlFor="privacy_consent" className="text-sm text-slate-700">
              <span className="font-medium">I consent</span> to the collection and processing of my personal
              information as described above. I understand that this consent is required for registration
              into the CVO livestock program. *
            </label>
          </div>
          {errors.privacy_consent_given && (
            <p className="text-red-500 text-xs mt-2">Privacy consent is required to register.</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !privacyConsent}
            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-600/20 flex items-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Register Beneficiary
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
