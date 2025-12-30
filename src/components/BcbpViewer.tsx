import { ParsedBcbp } from '../lib/bcbp';
import { AIRLINE_NAMES, AIRPORT_NAMES } from '../data/bcbp_reference';
import { useState } from 'react';

interface BcbpViewerProps {
  parsed: ParsedBcbp;
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

export default function BcbpViewer({ parsed }: BcbpViewerProps) {
  const [activeLegIndex, setActiveLegIndex] = useState(0);

  const leg = parsed.legs[activeLegIndex];
  if (!leg) return <div className="text-red-400">No flight leg data found.</div>;

  const fromCity = getCity(leg.departureAirport);
  const toCity = getCity(leg.arrivalAirport);
  const fromAirport = getAirportName(leg.departureAirport);
  const toAirport = getAirportName(leg.arrivalAirport);
  const airline = getAirlineName(leg.operatingCarrier);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. Summary Card */}
      <div className="bg-gradient-to-br from-brand-green/20 to-brand-dark border border-brand-green/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">

        {/* Header with Passenger Name */}
        <div className="border-b border-white/10 pb-4 mb-4 flex justify-between items-end">
           <div>
             <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Passenger</p>
             <p className="text-xl text-white font-medium truncate max-w-[250px]">{parsed.passengerName}</p>
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
             {parsed.gender && <DetailRow label="Gender (V8)" value={parsed.gender === 'X' ? 'Unspecified' : parsed.gender === 'U' ? 'Undisclosed' : parsed.gender} />}
        </div>
      </div>

       {/* 3. Raw Data (Debug) */}
       <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl">
           <details>
               <summary className="cursor-pointer text-gray-400 text-sm hover:text-white">View Raw Data Object</summary>
               <pre className="mt-4 bg-black/50 p-4 rounded text-xs text-green-400 overflow-x-auto">
                   {JSON.stringify(parsed, null, 2)}
               </pre>
           </details>
       </div>

    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string | null }) {
    if (!value) return null;
    return (
        <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
            <span className="text-white font-medium">{value}</span>
        </div>
    );
}
