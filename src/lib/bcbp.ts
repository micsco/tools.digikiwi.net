export interface BcbpSegment {
  id: string;
  label: string;
  rawValue: string;
  startIndex: number;
  endIndex: number;
  description: string;
}

export interface ParsedBcbp {
  raw: string;
  segments: BcbpSegment[];
  data: {
    passengerName: string;
    pnr: string;
    fromCity: string;
    toCity: string;
    carrier: string;
    flightNumber: string;
    julianDate: string;
    seat: string;
    checkInSeq: string;
    passengerStatus: string;
    dateOfIssue?: string; // Optional from conditional block
    [key: string]: string | undefined;
  };
  formatted: {
    flight: string;
    seat: string;
    date: string;
    passengerName: string;
    route: string;
  };
}

interface BcbpFieldDefinition {
  id: string;
  label: string;
  length: number;
  description: string;
  validate?: (value: string) => boolean;
}

const MANDATORY_FIELDS_LENGTH = 60;

const BCBP_SCHEMA: BcbpFieldDefinition[] = [
  {
    id: 'formatCode',
    label: 'Format',
    length: 1,
    description: 'Format Code (M)',
    // Only 'M' (Mandatory + Unique items) is currently supported.
    // 'S' (Mandatory only) is another valid IATA format code but not implemented here.
    validate: (v) => v === 'M'
  },
  { id: 'legs', label: 'Legs', length: 1, description: 'Number of Legs' },
  { id: 'passengerName', label: 'Name', length: 20, description: 'Passenger Name' },
  { id: 'eticket', label: 'E-Ticket', length: 1, description: 'Electronic Ticket Indicator' },
  { id: 'pnr', label: 'PNR', length: 7, description: 'Booking Reference (PNR)' },
  {
    id: 'fromCity',
    label: 'From',
    length: 3,
    description: 'Origin Airport',
    validate: (v) => /^[A-Z]{3}\s*$/.test(v)
  },
  {
    id: 'toCity',
    label: 'To',
    length: 3,
    description: 'Destination Airport',
    validate: (v) => /^[A-Z]{3}\s*$/.test(v)
  },
  {
    id: 'carrier',
    label: 'Carrier',
    length: 3,
    description: 'Operating Carrier',
    validate: (v) => /^[A-Z0-9]{2,3}\s*$/.test(v)
  },
  {
    id: 'flightNumber',
    label: 'Flight',
    length: 5,
    description: 'Flight Number',
    // IATA standard requires numeric flight numbers (1-4 digits, often 0-padded to 4 or 5 chars in BCBP).
    validate: (v) => /^\d{1,5}\s*$/.test(v)
  },
  { id: 'julianDate', label: 'Date', length: 3, description: 'Date of Flight (Julian)' },
  { id: 'compartment', label: 'Class', length: 1, description: 'Compartment Code' },
  { id: 'seat', label: 'Seat', length: 4, description: 'Seat Number' },
  { id: 'checkInSeq', label: 'Seq', length: 5, description: 'Check-in Sequence' },
  { id: 'passengerStatus', label: 'Status', length: 1, description: 'Passenger Status' },
];

// Helper to format Julian Date (DDD) to readable date (e.g. "Feb 01")
// Assumes current year if not provided, which might be off for year-boundary flights.
function formatJulianDate(julian: string, year?: number): string {
  const dayOfYear = parseInt(julian, 10);
  if (isNaN(dayOfYear)) return julian;

  // If year is not provided, try to guess or just show generic "Day X"
  // But users expect a date. Let's pick current year, but if the resulting date is > 11 months away, maybe it was last year?
  // Safe bet: Just format as "Day D of Year" if unsure, or default to current year.
  // Ideally, if we have dateOfIssue, we use that year.
  const targetYear = year || new Date().getFullYear();

  const date = new Date(targetYear, 0); // Jan 1st
  date.setDate(dayOfYear);

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatSeat(seat: string): string {
  // Seat often 012A -> 12A
  return seat.replace(/^0+/, '');
}

function formatFlight(carrier: string, number: string): string {
  // BA 0123 -> BA 123
  return `${carrier.trim()} ${number.trim().replace(/^0+/, '')}`;
}

function formatName(name: string): string {
  // DOE/JOHN -> John Doe
  // OR keep LAST/FIRST format but cleaner?
  // User asked for "human friendly". "John Doe" is friendlier than "DOE/JOHN".
  if (name.includes('/')) {
    const [last, first] = name.split('/');
    // Title case helper
    const toTitleCase = (str: string) => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    return `${toTitleCase(first)} ${toTitleCase(last)}`;
  }
  return name;
}

/**
 * Parses a raw IATA Bar Coded Boarding Pass (BCBP) string into a structured representation.
 */
export function parseBcbp(raw: string): ParsedBcbp | null {
  if (!raw || raw.length < MANDATORY_FIELDS_LENGTH) return null;

  const segments: BcbpSegment[] = [];
  const data: ParsedBcbp['data'] = {
    passengerName: '',
    pnr: '',
    fromCity: '',
    toCity: '',
    carrier: '',
    flightNumber: '',
    julianDate: '',
    seat: '',
    checkInSeq: '',
    passengerStatus: '',
  };

  let cursor = 0;

  // 1. Mandatory Block Parsing
  for (const field of BCBP_SCHEMA) {
    if (cursor + field.length > raw.length) return null;

    const value = raw.substring(cursor, cursor + field.length);

    if (field.validate && !field.validate(value)) {
      return null;
    }

    segments.push({
      id: field.id,
      label: field.label,
      rawValue: value,
      startIndex: cursor,
      endIndex: cursor + field.length,
      description: field.description,
    });

    if (field.id in data) {
      data[field.id] = value.trim();
    }

    cursor += field.length;
  }

  // 2. Conditional Block Parsing
  // Check for the field size of the variable size field (2 chars hex)
  let dateOfIssueYear: number | undefined;

  if (cursor + 2 <= raw.length) {
       const varSizeHex = raw.substring(cursor, cursor + 2);
       const varSize = parseInt(varSizeHex, 16);

       segments.push({
         id: 'varSize',
         label: 'Size',
         rawValue: varSizeHex,
         startIndex: cursor,
         endIndex: cursor + 2,
         description: `Length of conditional data (${varSize})`,
       });

       cursor += 2;

       // If valid size, try to parse known conditional fields
       // Note: Structure varies, but often:
       // > [0] Version (1)
       // > [1] Passenger Desc (1)
       // > [2] Source Checkin (1)
       // > [3] Source BP Issue (1)
       // > [4-7] Date Issue (4) (Julian + 1 digit year)
       // This is assuming "Unique Conditional Data" follows standard sequence.

       if (!isNaN(varSize) && varSize > 0 && cursor + varSize <= raw.length) {
         // Create a segment for the whole block for now, or split if we can identify version
         // Let's try to detect Date of Issue (Field 22)
         // Usually at offset 4 inside the unique block if version > 1?
         // This is heuristically complex without full implementation.
         // Let's just create a "Conditional Data" segment for the bulk
         // But TRY to peek at index 4-7 for Date of Issue if length allows.

         const condData = raw.substring(cursor, cursor + varSize);

         // Heuristic: If we have at least 8 chars, we might find Date of Issue at index 4 (length 4)
         // Julian Date (3) + Year (1)
         // Example: 1004 (Day 100, Year 4 -> 2024)
         if (condData.length >= 8 && /^\d{4}$/.test(condData.substring(4, 8))) {
            const dateIssueVal = condData.substring(4, 8);
            data.dateOfIssue = dateIssueVal;
            const yDigit = parseInt(dateIssueVal[3], 10);

            // Guess full year from 1 digit.
            // Current year
            const currentYear = new Date().getFullYear();
            const currentDecade = Math.floor(currentYear / 10) * 10;
            dateOfIssueYear = currentDecade + yDigit;

            // Adjust decade if needed (e.g. current 2024, digit 9 -> 2019? unlikely for BP, usually 2029 or 2019?)
            // Usually BP is for close future/past.
            // If we are 2020 and digit is 9 -> 2019.
            // If we are 2020 and digit is 1 -> 2021.
            // Simple logic: Closest to current year.
         }

         segments.push({
            id: 'conditionalData',
            label: 'Ext. Data',
            rawValue: condData,
            startIndex: cursor,
            endIndex: cursor + varSize,
            description: 'Conditional / Airline Data',
         });

         cursor += varSize;
       }
  }

  // 3. Security Data (remainder)
  if (cursor < raw.length) {
    segments.push({
      id: 'securityData',
      label: 'Security',
      rawValue: raw.substring(cursor),
      startIndex: cursor,
      endIndex: raw.length,
      description: 'Security Signature',
    });
  }

  // Generate formatted data
  const formatted = {
    flight: formatFlight(data.carrier || '', data.flightNumber || ''),
    seat: formatSeat(data.seat || ''),
    date: formatJulianDate(data.julianDate || '', dateOfIssueYear),
    passengerName: formatName(data.passengerName || ''),
    route: `${data.fromCity} ➝ ${data.toCity}`,
  };

  return {
    raw,
    segments,
    data,
    formatted,
  };
}
