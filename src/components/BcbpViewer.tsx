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
  id: string; // for tracking which field it is
}

const DISPLAY_FIELDS: FieldConfig[] = [
  { label: 'Passenger', value: (p) => p.formatted.passengerName, icon: '👤', id: 'passengerName' },
  { label: 'Airline', value: (p) => p.formatted.airlineFull, icon: '🏢', id: 'airlineFull' },
  { label: 'Booking Ref', value: (p) => p.data.pnr, icon: '🔖', id: 'pnr' },
  { label: 'Flight', value: (p) => p.formatted.flight, icon: '✈️', id: 'flight' },
  { label: 'Seat', value: (p) => p.formatted.seat, icon: '💺', id: 'seat' },
  { label: 'Class', value: (p) => p.formatted.classOfService, icon: '🎖️', id: 'compartment' },
  { label: 'Date', value: (p) => p.formatted.date, icon: '📅', id: 'date' },
  { label: 'Route', value: (p) => p.formatted.route, icon: '🌍', id: 'route' },
  { label: 'Seq', value: (p) => p.data.checkInSeq, icon: '🔢', id: 'seq' },
  { label: 'Status', value: (p) => p.data.passengerStatus, icon: 'ℹ️', id: 'status' },
];

export default function BcbpViewer({ parsed }: BcbpViewerProps) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const selectedSegment = parsed.segments.find(s => s.id === selectedSegmentId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. Summary Card (Mobile First High Level Info) */}
      <div className="bg-gradient-to-br from-brand-green/20 to-brand-dark border border-brand-green/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">

        {/* Route with Full Names */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
           <div className="text-center md:text-left">
             <div className="text-4xl font-black text-white tracking-widest">{parsed.data.fromCity}</div>
             <p className="text-xs text-brand-accent/80 mt-1 max-w-[150px] truncate">{parsed.formatted.fromAirportFull}</p>
           </div>

           <div className="text-gray-500 text-2xl rotate-90 md:rotate-0">✈</div>

           <div className="text-center md:text-right">
             <div className="text-4xl font-black text-white tracking-widest">{parsed.data.toCity}</div>
             <p className="text-xs text-brand-accent/80 mt-1 max-w-[150px] truncate">{parsed.formatted.toAirportFull}</p>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-brand-accent uppercase tracking-wider mb-1">Flight</p>
            <p className="text-2xl font-bold text-white">{parsed.formatted.flight}</p>
            <p className="text-xs text-gray-400">{parsed.formatted.airlineFull}</p>
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

             // Find corresponding segment to get meta info if available
             // Note: parsed.segments has raw segments.
             // Mapping 'compartment' field to 'compartment' segment ID
             const segment = parsed.segments.find(s => s.id === field.id);
             const possibleValues = segment?.meta?.possibleValues;

             return (
               <DetailCard
                 key={idx}
                 label={field.label}
                 value={val}
                 icon={field.icon}
                 possibleValues={possibleValues}
               />
             );
          })}
        </div>
      </div>

      {/* 3. Conditional Data (if any) */}
      {parsed.data.dateOfIssue || parsed.segments.some(s => s.id === 'conditionalContent') ? (
         <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 md:p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-brand-accent">Airline Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {parsed.data.dateOfIssue && (
                 <DetailCard
                   label="Date of Issue"
                   value={`Day ${parsed.data.dateOfIssue}`}
                   icon="📅"
                 />
               )}
               {parsed.segments.filter(s => s.id === 'conditionalContent').map((s, i) => (
                  <div key={i} className="col-span-full">
                     <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Raw Airline Data</p>
                     <code className="block bg-black/30 p-2 rounded text-sm font-mono break-all text-gray-300">
                        {s.rawValue}
                     </code>
                  </div>
               ))}
            </div>
         </div>
      ) : null}

      {/* 4. Interactive Raw Data Inspector */}
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
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-brand-accent text-xs uppercase tracking-wider font-bold mb-1">{selectedSegment.label}</p>
                    <p className="text-white text-md font-medium">{selectedSegment.description}</p>
                  </div>
                  {selectedSegment.meta?.possibleValues && (
                    <div className="text-xs bg-brand-dark/50 p-2 rounded border border-gray-600 max-w-[200px] max-h-[100px] overflow-y-auto">
                      <strong className="block mb-1 text-gray-400">Values:</strong>
                      {Object.entries(selectedSegment.meta.possibleValues).map(([k, v]) => (
                        <div key={k}><span className="text-brand-accent">{k}</span>: {v}</div>
                      ))}
                    </div>
                  )}
               </div>

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

function DetailCard({ label, value, icon, possibleValues }: { label: string; value: string; icon: string, possibleValues?: Record<string, string> }) {
  const [showValues, setShowValues] = useState(false);

  return (
    <div className="relative group">
      <div
        className={`flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg transition-colors ${possibleValues ? 'cursor-pointer hover:bg-gray-800' : ''}`}
        data-testid="detail-card"
        onClick={() => possibleValues && setShowValues(!showValues)}
      >
        <div className="text-2xl">{icon}</div>
        <div className="flex-grow">
          <p className="text-xs text-gray-400 uppercase tracking-wider flex items-center">
            {label}
            {possibleValues && <span className="ml-2 text-[10px] bg-gray-700 px-1 rounded text-gray-300">ℹ️ Info</span>}
          </p>
          <p className="font-medium text-lg text-white">{value}</p>
        </div>
      </div>

      {/* Popover/Expand for possible values */}
      {showValues && possibleValues && (
        <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 animate-in fade-in zoom-in-95 duration-200">
           <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
             <h4 className="text-xs font-bold text-white uppercase">Possible Values</h4>
             <button onClick={(e) => { e.stopPropagation(); setShowValues(false); }} className="text-gray-400 hover:text-white">✕</button>
           </div>
           <div className="max-h-48 overflow-y-auto text-sm space-y-1">
              {Object.entries(possibleValues).map(([code, desc]) => (
                <div key={code} className="flex justify-between">
                  <span className="font-mono text-brand-accent font-bold">{code}</span>
                  <span className="text-gray-300 text-right">{desc}</span>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
