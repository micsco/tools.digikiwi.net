import { ParsedBcbp } from '../lib/bcbp';
import { useState } from 'react';

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
  value: (data: ParsedBcbp) => string;
  icon: string;
}

const DISPLAY_FIELDS: FieldConfig[] = [
  { label: 'Passenger', value: (p) => p.formatted.passengerName, icon: '👤' },
  { label: 'Booking Ref', value: (p) => p.data.pnr, icon: '🔖' },
  { label: 'Flight', value: (p) => p.formatted.flight, icon: '✈️' },
  { label: 'Seat', value: (p) => p.formatted.seat, icon: '💺' },
  { label: 'Class', value: (p) => p.formatted.classOfService, icon: '🎖️' },
  { label: 'Date', value: (p) => p.formatted.date, icon: '📅' },
  { label: 'Route', value: (p) => p.formatted.route, icon: '🌍' },
  { label: 'Seq', value: (p) => p.data.checkInSeq, icon: '🔢' },
  { label: 'Status', value: (p) => p.data.passengerStatus, icon: 'ℹ️' },
];

export default function BcbpViewer({ parsed }: BcbpViewerProps) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const selectedSegment = parsed.segments.find(s => s.id === selectedSegmentId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. Summary Card (Mobile First High Level Info) */}
      <div className="bg-gradient-to-br from-brand-green/20 to-brand-dark border border-brand-green/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
           <div className="text-4xl font-black text-white tracking-widest">{parsed.data.fromCity}</div>
           <div className="text-gray-500 pt-2 text-2xl">✈</div>
           <div className="text-4xl font-black text-white tracking-widest">{parsed.data.toCity}</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-brand-accent uppercase tracking-wider mb-1">Flight</p>
            <p className="text-2xl font-bold text-white">{parsed.formatted.flight}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-accent uppercase tracking-wider mb-1">Seat</p>
            <p className="text-2xl font-bold text-white">{parsed.formatted.seat}</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 flex justify-between items-end">
           <div>
             <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Passenger</p>
             <p className="text-lg text-white font-medium truncate max-w-[150px] md:max-w-[250px]">{parsed.formatted.passengerName}</p>
             {parsed.formatted.classOfService && (
               <p className="text-xs text-brand-accent mt-1">{parsed.formatted.classOfService}</p>
             )}
           </div>
           <div className="text-right">
             <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Date</p>
             <p className="text-lg text-white font-medium">{parsed.formatted.date}</p>
           </div>
        </div>
      </div>

      {/* 2. Decoded Details Grid */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 md:p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-6 text-brand-accent">Full Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DISPLAY_FIELDS.map((field, idx) => {
             const val = field.value(parsed);
             if (!val) return null;
             return (
               <DetailCard
                 key={idx}
                 label={field.label}
                 value={val}
                 icon={field.icon}
               />
             );
          })}
        </div>
      </div>

      {/* 3. Interactive Raw Data Inspector */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 md:p-6 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-brand-accent">Data Inspector</h3>
            <p className="text-xs text-gray-400 mt-1">Tap colored segments below to see what each part of the barcode means.</p>
          </div>
        </div>

        {/* Sticky detail view for selected segment */}
        <div className="min-h-[80px] mb-4 bg-gray-800/80 rounded-lg p-4 border border-gray-600 transition-all shadow-inner">
          {selectedSegment ? (
             <div className="animate-in fade-in slide-in-from-top-1 duration-200">
               <p className="text-brand-accent text-xs uppercase tracking-wider font-bold mb-1">{selectedSegment.label}</p>
               <p className="text-white text-md font-medium">{selectedSegment.description}</p>
               <div className="flex items-center mt-2 pt-2 border-t border-gray-700/50">
                 <span className="text-gray-500 text-xs font-mono mr-2">Raw Value:</span>
                 <code className="bg-black/30 px-2 py-0.5 rounded text-brand-accent font-mono text-sm break-all">
                   {selectedSegment.rawValue.replace(/ /g, '␣')}
                 </code>
               </div>
             </div>
          ) : (
             <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
               <span className="mr-2">👆</span> Select a segment below to view details
             </div>
          )}
        </div>

        <div className="font-mono text-lg break-all leading-loose">
          {parsed.segments.map((segment, index) => {
            const colorClass = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
            const isSelected = selectedSegmentId === segment.id;

            return (
              <button
                key={`${segment.id}-${index}`}
                onClick={() => setSelectedSegmentId(segment.id)}
                className={`inline-block border-b-2 px-1 mx-0.5 rounded-t transition-all
                  ${colorClass}
                  ${isSelected
                    ? 'ring-2 ring-brand-accent ring-offset-2 ring-offset-gray-900 border-brand-accent brightness-125 z-10 relative shadow-lg'
                    : 'opacity-80 hover:opacity-100 hover:brightness-110 border-transparent'}
                  cursor-pointer focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900
                  min-h-[44px] min-w-[30px] align-middle`}
                tabIndex={0}
                role="button"
                aria-label={`Select ${segment.label}`}
                aria-expanded={isSelected}
              >
                {segment.rawValue}
              </button>
            );
          })}
        </div>
      </div>

       <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-2 text-white">How it works</h3>
        <p className="text-gray-400 text-sm">
           The scanner parses the <strong>IATA BCBP (Bar Coded Boarding Pass)</strong> standard.
           It decodes the mandatory flight information and highlights individual data segments.
           Formatting (dates, names) is applied for readability.
        </p>
      </div>

    </div>
  );
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon: string }) {
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
