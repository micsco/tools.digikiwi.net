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
    compartment: string;
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
    classOfService: string;
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
    description: 'Format Code (M = Mandatory)',
    // Only 'M' (Mandatory + Unique items) is currently supported.
    // 'S' (Mandatory only) is another valid IATA format code but not implemented here.
    validate: (v) => v === 'M'
  },
  { id: 'legs', label: 'Legs', length: 1, description: 'Number of Legs Encoded' },
  { id: 'passengerName', label: 'Name', length: 20, description: 'Passenger Name (Last/First)' },
  { id: 'eticket', label: 'E-Ticket', length: 1, description: 'Electronic Ticket Indicator (E)' },
  { id: 'pnr', label: 'PNR', length: 7, description: 'Booking Reference / PNR' },
  {
    id: 'fromCity',
    label: 'From',
    length: 3,
    description: 'Origin Airport IATA Code',
    validate: (v) => /^[A-Z]{3}\s*$/.test(v)
  },
  {
    id: 'toCity',
    label: 'To',
    length: 3,
    description: 'Destination Airport IATA Code',
    validate: (v) => /^[A-Z]{3}\s*$/.test(v)
  },
  {
    id: 'carrier',
    label: 'Carrier',
    length: 3,
    description: 'Operating Carrier Designator',
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
  { id: 'julianDate', label: 'Date', length: 3, description: 'Date of Flight (Julian Day 001-366)' },
  { id: 'compartment', label: 'Class', length: 1, description: 'Compartment Code (Class of Service)' },
  { id: 'seat', label: 'Seat', length: 4, description: 'Seat Number' },
  { id: 'checkInSeq', label: 'Seq', length: 5, description: 'Check-in Sequence Number' },
  { id: 'passengerStatus', label: 'Status', length: 1, description: 'Passenger Status' },
];

// Helper to format Julian Date (DDD) to readable date (e.g. "Feb 01")
function formatJulianDate(julian: string, year?: number): string {
  const dayOfYear = parseInt(julian, 10);
  if (isNaN(dayOfYear)) return julian;

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
  if (name.includes('/')) {
    const [last, first] = name.split('/');
    // Title case helper
    const toTitleCase = (str: string) => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    return `${toTitleCase(first)} ${toTitleCase(last)}`;
  }
  return name;
}

function formatClass(code: string): string {
  // Common IATA codes mapping
  // F: First, J: Business, W: Premium Economy, Y: Economy
  // C, D, I, Z -> Business
  // A, P -> First
  // B, H, K, M, L, V, S, N, Q, O... -> Economy

  const c = code.trim().toUpperCase();
  switch (c) {
    case 'F':
    case 'A':
    case 'P':
      return `First Class (${c})`;
    case 'J':
    case 'C':
    case 'D':
    case 'I':
    case 'Z':
      return `Business Class (${c})`;
    case 'W':
      return `Premium Economy (${c})`;
    case 'Y':
    case 'B':
    case 'H':
    case 'K':
    case 'M':
    case 'L':
    case 'V':
    case 'S':
    case 'N':
    case 'Q':
    case 'O':
      return `Economy Class (${c})`;
    default:
      return c.length > 0 ? `Class ${c}` : '';
  }
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
    compartment: '',
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

       if (!isNaN(varSize) && varSize > 0 && cursor + varSize <= raw.length) {
         const condData = raw.substring(cursor, cursor + varSize);

         // Heuristic: If we have at least 8 chars, we might find Date of Issue at index 4 (length 4)
         // Julian Date (3) + Year (1)
         // Example: 1004 (Day 100, Year 4 -> 2024)
         if (condData.length >= 8 && /^\d{4}$/.test(condData.substring(4, 8))) {
            const dateIssueVal = condData.substring(4, 8);
            data.dateOfIssue = dateIssueVal;
            const yDigit = parseInt(dateIssueVal[3], 10);

            // Guess full year from 1 digit.
            const currentYear = new Date().getFullYear();
            const currentDecade = Math.floor(currentYear / 10) * 10;
            dateOfIssueYear = currentDecade + yDigit;
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
    classOfService: formatClass(data.compartment || ''),
  };

  return {
    raw,
    segments,
    data,
    formatted,
  };
}
