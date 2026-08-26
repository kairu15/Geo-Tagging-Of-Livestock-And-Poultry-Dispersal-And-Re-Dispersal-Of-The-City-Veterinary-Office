import { useParams, Link } from 'react-router-dom';
import { useBeneficiary, useBeneficiaryCurrentHoldings, useBeneficiaryFullHistory } from '../api/hooks';
import { ArrowLeft, MapPin, Phone, Mail, FileText } from 'lucide-react';

export default function BeneficiaryDetailPage() {
  const { id } = useParams();
  const { data: beneficiary, isLoading } = useBeneficiary(id);
  const { data: holdings } = useBeneficiaryCurrentHoldings(id);
  const { data: history } = useBeneficiaryFullHistory(id);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (!beneficiary) {
    return <div className="text-center text-gray-500 py-8">Beneficiary not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/beneficiaries" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Back to Beneficiaries
      </Link>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{beneficiary.full_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {beneficiary.barangay_name}
              {beneficiary.sitio_purok && ` — ${beneficiary.sitio_purok}`}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            beneficiary.is_active_beneficiary ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {beneficiary.is_active_beneficiary ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4 text-gray-400" />
            {beneficiary.contact_number || 'No contact'}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4 text-gray-400" />
            {beneficiary.email || 'No email'}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4 text-gray-400" />
            {beneficiary.valid_id_type || 'No ID on file'}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            {beneficiary.latitude
              ? `${Number(beneficiary.latitude).toFixed(4)}, ${Number(beneficiary.longitude).toFixed(4)}`
              : 'No coordinates'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <span className="text-gray-400">Livelihood:</span>{' '}
            <span className="text-gray-700">{beneficiary.livelihood_type || '—'}</span>
          </div>
          <div>
            <span className="text-gray-400">Household Head:</span>{' '}
            <span className="text-gray-700">{beneficiary.household_head ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="text-gray-400">Registered:</span>{' '}
            <span className="text-gray-700">{beneficiary.date_registered}</span>
          </div>
          <div>
            <span className="text-gray-400">Current Animals Held:</span>{' '}
            <span className="text-green-600 font-medium">{beneficiary.current_animal_count}</span>
          </div>
        </div>

        {beneficiary.full_address && (
          <p className="text-sm text-gray-500 mt-3">
            Address: {beneficiary.full_address}
          </p>
        )}
      </div>

      {/* Current Holdings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Animal Holdings</h2>
        {holdings?.length > 0 ? (
          <div className="space-y-3">
            {holdings.map((animal) => (
              <Link
                key={animal.id}
                to={`/animals/${animal.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors"
              >
                <div>
                  <span className="font-mono text-sm font-medium text-gray-900">{animal.tag_id}</span>
                  <span className="text-sm text-gray-500 ml-2">{animal.species_name}</span>
                  {animal.is_batch && (
                    <span className="text-xs text-blue-600 ml-2">Batch: {animal.batch_quantity}</span>
                  )}
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {animal.current_status_display}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No animals currently held.</p>
        )}
      </div>

      {/* Full History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ownership History</h2>
        {history?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Animal</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Period</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Reason</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((rec) => (
                  <tr key={rec.id}>
                    <td className="px-4 py-2 font-mono text-xs">{rec.animal_tag}</td>
                    <td className="px-4 py-2 text-gray-700">{rec.transfer_type_display}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {rec.start_date} — {rec.end_date || 'present'}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{rec.end_reason_name || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        rec.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No ownership records.</p>
        )}
      </div>
    </div>
  );
}
