const STATUS_CONFIG = {
  // Animal statuses
  AVAILABLE:          { label: 'Available',         color: 'bg-green-100 text-green-800 border-green-200' },
  DISPERSED:          { label: 'Dispersed',         color: 'bg-blue-100 text-blue-800 border-blue-200' },
  RETURNED_TO_CVO:    { label: 'Returned to CVO',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  DECEASED:           { label: 'Deceased',          color: 'bg-red-100 text-red-800 border-red-200' },
  UNDER_RE_DISPERSAL_REVIEW: { label: 'Under Review', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  CULLED:             { label: 'Culled',            color: 'bg-gray-100 text-gray-700 border-gray-200' },
  SOLD_WITH_APPROVAL: { label: 'Sold',              color: 'bg-orange-100 text-orange-800 border-orange-200' },

  // Record statuses
  ACTIVE:   { label: 'Active',   color: 'bg-green-100 text-green-800 border-green-200' },
  CLOSED:   { label: 'Closed',   color: 'bg-gray-100 text-gray-600 border-gray-200' },

  // Beneficiary statuses
  'true':  { label: 'Active',   color: 'bg-green-100 text-green-800 border-green-200' },
  'false': { label: 'Inactive', color: 'bg-gray-100 text-gray-600 border-gray-200' },

  // Request statuses
  PENDING:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' },

  // Condition
  HEALTHY:    { label: 'Healthy',    color: 'bg-green-100 text-green-800 border-green-200' },
  SICK:       { label: 'Sick',       color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  INJURED:    { label: 'Injured',    color: 'bg-orange-100 text-orange-800 border-orange-200' },
  UNDERWEIGHT:{ label: 'Underweight',color: 'bg-blue-100 text-blue-800 border-blue-200' },
  PREGNANT:   { label: 'Pregnant',   color: 'bg-pink-100 text-pink-800 border-pink-200' },
};

const DEFAULT_CONFIG = { label: 'Unknown', color: 'bg-gray-100 text-gray-600 border-gray-200' };

export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || { ...DEFAULT_CONFIG, label: status || 'Unknown' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}
