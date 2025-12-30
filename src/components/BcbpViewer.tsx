import { ParsedBcbp } from '../lib/bcbp';

interface BcbpViewerProps {
  parsed: ParsedBcbp;
}

// Visual colors for segments
const SEGMENT_COLORS = [
  'bg-blue-900 border-blue-500 text-blue-100',
  'bg-green-900 border-green-500 text-green-100',
  'bg-purple-900 border-purple-500 text-purple-100',
  'bg-yellow-900 border-yellow-500 text-yellow-100',
  'bg-red-900 border-red-500 text-red-100',
  'bg-indigo-900 border-indigo-500 text-indigo-100',
];

interface FieldConfig {
  label: string;
  key: keyof ParsedBcbp['data'] | ((data: ParsedBcbp['data']) => string);
  icon: string;
}

const DISPLAY_FIELDS: FieldConfig[] = [
  { label: 'Passenger Name', key: 'passengerName', icon: '👤' },
  { label: 'PNR / Booking Ref', key: 'pnr', icon: '🔖' },
  // Only show flight if carrier OR flight number exists
  { label: 'Flight', key: (data) => (data.carrier || data.flightNumber) ? `${data.carrier}${data.flightNumber}` : '', icon: '✈️' },
  // Only show route if from OR to exists
  { label: 'Route', key: (data) => (data.fromCity || data.toCity) ? `${data.fromCity} ➝ ${data.toCity}` : '', icon: '🌍' },
  { label: 'Seat', key: 'seat', icon: '💺' },
  { label: 'Date (Julian)', key: 'julianDate', icon: '📅' },
  { label: 'Sequence', key: 'checkInSeq', icon: '🔢' },
  { label: 'Status', key: 'passengerStatus', icon: 'ℹ️' },
];

export default function BcbpViewer({ parsed }: BcbpViewerProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Raw Data Visualization */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-brand-accent">Raw Data Structure</h3>
        <div className="font-mono text-lg break-all leading-loose">
          {parsed.segments.map((segment, index) => {
            const colorClass = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
            return (
              <span
                key={`${segment.id}-${index}`}
                className={`inline-block border-b-2 px-1 mx-0.5 rounded-t ${colorClass} transition-all hover:brightness-125 cursor-help group relative focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900`}
                tabIndex={0}
                role="button"
                aria-label={`${segment.label}: ${segment.description}`}
              >
                {segment.rawValue}
                {/* Tooltip */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus:opacity-100 whitespace-nowrap pointer-events-none z-10 border border-gray-600 transition-opacity">
                  {segment.label}: {segment.description}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Decoded Details */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-6 text-brand-accent">Decoded Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DISPLAY_FIELDS.map((field, idx) => {
             const value = typeof field.key === 'function'
               ? field.key(parsed.data)
               : parsed.data[field.key];

             return (
               <DetailCard
                 key={idx}
                 label={field.label}
                 value={value}
                 icon={field.icon}
               />
             );
          })}
        </div>
      </div>

       <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-2 text-white">How it works</h3>
        <p className="text-gray-400 text-sm">
           The raw data above is parsed according to the <strong>IATA BCBP (Bar Coded Boarding Pass)</strong> standard.
           Each highlighted section corresponds to a specific field defined in the resolution 792.
           The scanner runs entirely in your browser; no data is sent to any server.
        </p>
      </div>

    </div>
  );
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg" data-testid="detail-card">
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="font-medium text-lg text-white">{value}</p>
      </div>
    </div>
  );
}
