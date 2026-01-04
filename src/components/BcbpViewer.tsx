import { ParsedBcbp, Segment } from '../lib/bcbp';
import { AIRLINE_NAMES, AIRPORT_NAMES } from '../data/bcbp_reference';
import { useState } from 'react';

interface BcbpViewerProps {
  parsed: ParsedBcbp;
  segments?: Segment[];
}

// Helpers
const getAirlineName = (code: string) => AIRLINE_NAMES[code] || code;
const getAirportName = (code: string) => {
  const airport = AIRPORT_NAMES[code];
  return airport ? `${airport.name} (${airport.city})` : code;
};
const getCity = (code: string) => {
    const airport = AIRPORT_NAMES[code];
    return airport ? airport.city : code;
};

export default function BcbpViewer({ parsed, segments }: BcbpViewerProps) {
  const [activeLegIndex, setActiveLegIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'parsed' | 'raw'>('parsed');

  const leg = parsed.legs[activeLegIndex];
  if (!leg) return <div className="text-red-400">No flight leg data found.</div>;

  const fromCity = getCity(leg.departureAirport);
  const toCity = getCity(leg.arrivalAirport);
  const fromAirport = getAirportName(leg.departureAirport);
  const toAirport = getAirportName(leg.arrivalAirport);
  const airline = getAirlineName(leg.operatingCarrier);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-700 pb-2">
          <button
             onClick={() => setActiveTab('parsed')}
             className={`text-sm font-medium pb-2 px-4 transition-colors ${activeTab === 'parsed' ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-gray-400 hover:text-white'}`}
          >
              Parsed Data
          </button>
          <button
             onClick={() => setActiveTab('raw')}
             className={`text-sm font-medium pb-2 px-4 transition-colors ${activeTab === 'raw' ? 'text-brand-accent border-b-2 border-brand-accent' : 'text-gray-400 hover:text-white'}`}
          >
              Raw Data Inspector
          </button>
      </div>

      {activeTab === 'parsed' ? (
        <>
          {/* 1. Summary Card */}
          <div className="bg-gradient-to-br from-brand-green/20 to-brand-dark border border-brand-green/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">

            {/* Header with Passenger Name */}
            <div className="border-b border-white/10 pb-4 mb-4 flex justify-between items-end">
               <div>
                 <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Passenger</p>
                 <p className="text-xl text-white font-medium truncate max-w-[250px]">{parsed.passengerName}</p>
                 {parsed.passengerDescription && <p className="text-xs text-gray-500">{parsed.passengerDescription === 'A' ? 'Adult' : parsed.passengerDescription}</p>}
               </div>
               {parsed.numberOfLegs > 1 && (
                   <div className="text-right">
                       <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Leg</p>
                       <div className="flex gap-2">
                           {parsed.legs.map((_, idx) => (
                               <button
                                   key={idx}
                                   onClick={() => setActiveLegIndex(idx)}
                                   className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${idx === activeLegIndex ? 'bg-brand-accent text-brand-dark' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                               >
                                   {idx + 1}
                               </button>
                           ))}
                       </div>
                   </div>
               )}
            </div>

            {/* Route */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
               <div className="text-center md:text-left">
                 <div className="text-4xl font-black text-white tracking-widest">{leg.departureAirport}</div>
                 <p className="text-xs text-brand-accent/80 mt-1 max-w-[150px] truncate">{fromCity}</p>
               </div>

               <div className="text-gray-500 text-2xl rotate-90 md:rotate-0">✈</div>

               <div className="text-center md:text-right">
                 <div className="text-4xl font-black text-white tracking-widest">{leg.arrivalAirport}</div>
                 <p className="text-xs text-brand-accent/80 mt-1 max-w-[150px] truncate">{toCity}</p>
               </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-brand-accent uppercase tracking-wider mb-1">Flight</p>
                <p className="text-lg font-bold text-white">{leg.operatingCarrier} {leg.flightNumber}</p>
              </div>
               <div>
                <p className="text-xs text-brand-accent uppercase tracking-wider mb-1">Date</p>
                <p className="text-lg font-bold text-white">{leg.dateOfFlight ? `Day ${leg.dateOfFlight}` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-brand-accent uppercase tracking-wider mb-1">Seat</p>
                <p className="text-2xl font-bold text-white">{leg.seatNumber}</p>
              </div>
               <div>
                <p className="text-xs text-brand-accent uppercase tracking-wider mb-1">Class</p>
                <p className="text-lg font-bold text-white">{leg.compartment?.description || leg.compartment?.code || 'Y'}</p>
              </div>
            </div>

            {leg.passengerStatus && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <p className="text-sm text-white">{leg.passengerStatus.description || leg.passengerStatus.code}</p>
                </div>
            )}

            {/* Baggage Info */}
            {(leg.freeBaggageAllowance || (parsed.baggageTags && parsed.baggageTags.length > 0)) && (
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                     {leg.freeBaggageAllowance && (
                         <div>
                             <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Baggage Allowance</p>
                             <p className="text-sm text-white font-bold">{leg.freeBaggageAllowance}</p>
                         </div>
                     )}
                     {parsed.baggageTags && parsed.baggageTags.length > 0 && (
                         <div>
                             <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bag Tags</p>
                             <div className="flex flex-col text-sm text-white">
                                 {parsed.baggageTags.map(tag => <span key={tag}>{tag}</span>)}
                             </div>
                         </div>
                     )}
                </div>
            )}
          </div>

          {/* 2. Detailed Info */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 md:p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-6 text-brand-accent">Flight Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailRow label="Operating Carrier" value={airline} />
                <DetailRow label="Flight Number" value={leg.flightNumber} />
                <DetailRow label="Departure" value={fromAirport} />
                <DetailRow label="Arrival" value={toAirport} />
                <DetailRow label="PNR (Booking Ref)" value={leg.pnrCode} />
                <DetailRow label="Sequence #" value={leg.sequenceNumber} />
                <DetailRow label="Marketing Carrier" value={leg.marketingCarrier || 'N/A'} />
                <DetailRow label="Doc Type" value={parsed.documentType || null} />
                <DetailRow label="Issuer" value={parsed.issuer || null} />
                <DetailRow label="Date of Issue" value={parsed.issuanceDate ? String(parsed.issuanceDate) : null} />
                <DetailRow label="Fast Track" value={leg.fastTrack ? 'Yes' : 'No'} />
                <DetailRow label="FF Number" value={leg.frequentFlyerNumber || null} />
                <DetailRow label="FF Airline" value={leg.frequentFlyerAirline || null} />
                 {parsed.gender && <DetailRow label="Gender (V8)" value={parsed.gender === 'X' ? 'Unspecified' : parsed.gender === 'U' ? 'Undisclosed' : parsed.gender} />}
            </div>
          </div>
        </>
      ) : (
        <RawDataViewer segments={segments} />
      )}

    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string | null }) {
    if (!value || value === 'N/A' || value === 'No') return null; // Only show 'Yes' for boolean? Or show both?
    // User probably wants to see populated fields.
    if (value === 'No') return null;
    return (
        <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
            <span className="text-white font-medium break-all">{value}</span>
        </div>
    );
}

function RawDataViewer({ segments }: { segments?: Segment[] }) {
    const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null);

    if (!segments || segments.length === 0) {
        return <div className="text-gray-400 p-4">No segment data available.</div>;
    }

    // Sort segments by start index
    const sortedSegments = [...segments].sort((a, b) => a.start - b.start);

    // Determine full length
    const fullLength = sortedSegments.reduce((max, s) => Math.max(max, s.end), 0);

    // Build visualization
    // We iterate through all characters 0..fullLength
    // But better: Just render the segments.
    // If there are gaps (unlikely for BCBP except maybe between mandatory and conditional?), handle them.
    // Our SegmentExtractor captures everything except skipped padding?
    // Let's iterate segments and render spans.

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl overflow-x-auto">
             <div className="mb-4 h-12">
                 {hoveredSegment ? (
                     <div className="animate-in fade-in duration-200">
                         <p className="text-xs text-brand-accent uppercase tracking-wider">{hoveredSegment.label}</p>
                         <p className="text-white font-mono text-lg">{hoveredSegment.value || <span className="text-gray-600 italic">Empty</span>}</p>
                         <p className="text-xs text-gray-500 font-mono mt-1">Raw: "{hoveredSegment.raw}" [{hoveredSegment.start}-{hoveredSegment.end}] ({hoveredSegment.section})</p>
                     </div>
                 ) : (
                     <p className="text-gray-500 text-sm italic pt-2">Hover over the barcode data to inspect fields.</p>
                 )}
             </div>

             <div className="font-mono text-lg break-all leading-8 tracking-wide bg-black/30 p-4 rounded-lg">
                 {sortedSegments.map((seg, idx) => {
                     let colorClass = 'text-gray-300';
                     let bgClass = '';

                     switch(seg.section) {
                         case 'header': colorClass = 'text-blue-400'; break;
                         case 'leg_mandatory': colorClass = 'text-green-400'; break;
                         case 'conditional_unique': colorClass = 'text-purple-400'; break;
                         case 'conditional_leg': colorClass = 'text-yellow-400'; break;
                         case 'security': colorClass = 'text-red-400'; break;
                     }

                     // Helper to check if gap exists before this segment
                     // (Omitted for simplicity, assuming contiguous or spaces)

                     return (
                         <span
                             key={`${seg.start}-${idx}`}
                             className={`${colorClass} hover:bg-white/10 hover:text-white cursor-help transition-colors duration-150 px-0.5 rounded ${bgClass}`}
                             onMouseEnter={() => setHoveredSegment(seg)}
                             onMouseLeave={() => setHoveredSegment(null)}
                         >
                             {seg.raw}
                         </span>
                     );
                 })}
             </div>

             <div className="mt-4 flex gap-4 text-xs text-gray-400 flex-wrap">
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400/20 border border-blue-400 rounded"></div> Header</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-400/20 border border-green-400 rounded"></div> Mandatory Leg</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-400/20 border border-purple-400 rounded"></div> Unique Data</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400/20 border border-yellow-400 rounded"></div> Conditional Leg</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400/20 border border-red-400 rounded"></div> Security</div>
             </div>
        </div>
    );
}
