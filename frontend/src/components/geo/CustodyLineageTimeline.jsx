import { MapPin, Clock, ArrowRight, Link2, User } from 'lucide-react';

const typeColors = {
  FORMAL_BENEFICIARY: 'bg-blue-100 text-blue-800 border-blue-200',
  INFORMAL_CARETAKER: 'bg-purple-100 text-purple-800 border-purple-200',
  TEMPORARY_FOSTER: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CVO_HOLDING_FACILITY: 'bg-gray-100 text-gray-800 border-gray-200',
};

const typeLabels = {
  FORMAL_BENEFICIARY: 'Formal Beneficiary',
  INFORMAL_CARETAKER: 'Informal Caretaker',
  TEMPORARY_FOSTER: 'Temporary Foster',
  CVO_HOLDING_FACILITY: 'CVO Facility',
};

export default function CustodyLineageTimeline({ lineage = [] }) {
  if (!lineage.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No custody history recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-0">
        {lineage.map((record, idx) => {
          const isActive = record.status === 'ACTIVE';
          const isLast = idx === lineage.length - 1;

          return (
            <div key={record.id} className="relative pl-12 pb-6 last:pb-0">
              {/* Timeline dot */}
              <div
                className={`absolute left-3 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isActive
                    ? 'bg-green-500 border-green-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>

              {/* Card */}
              <div
                className={`rounded-xl p-4 border ${
                  isActive
                    ? 'bg-green-50 border-green-200 shadow-sm'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">
                        {record.caretaker_name}
                      </h4>
                      {isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    {record.caretaker_type && (
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
                          typeColors[record.caretaker_type] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {typeLabels[record.caretaker_type] || record.caretaker_type}
                      </span>
                    )}
                  </div>
                  {record.has_dispersion_link && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      <Link2 className="h-3 w-3" />
                      CVO Processed
                    </span>
                  )}
                </div>

                {/* Dates */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {record.start_date}
                    {record.end_date ? (
                      <>
                        <ArrowRight className="h-3 w-3 mx-1" />
                        {record.end_date}
                      </>
                    ) : (
                      <span className="ml-1 text-green-600 font-medium">— Present</span>
                    )}
                  </span>
                </div>

                {/* Location */}
                {record.start_latitude && record.start_longitude && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="h-3 w-3" />
                    ({Number(record.start_latitude).toFixed(4)}, {Number(record.start_longitude).toFixed(4)})
                  </div>
                )}

                {/* Condition */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                  <span>
                    Intake: <span className="font-medium text-gray-700">{record.intake_condition_display}</span>
                  </span>
                  {record.exit_condition_display && (
                    <span>
                      Exit: <span className="font-medium text-gray-700">{record.exit_condition_display}</span>
                    </span>
                  )}
                </div>

                {/* End reason */}
                {record.end_reason_name && (
                  <div className="text-xs text-gray-500 mt-1">
                    Reason: <span className="font-medium text-gray-700">{record.end_reason_name}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
