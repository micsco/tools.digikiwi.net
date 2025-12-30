import { BCBP_REFERENCE, AIRLINE_NAMES, AIRPORT_NAMES } from '../data/bcbp_reference';

export interface BcbpSegment {
  id: string;
  label: string;
  rawValue: string;
  startIndex: number;
  endIndex: number;
  description: string;
  meta?: {
    description?: string;
    possibleValues?: Record<string, string>;
  };
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
    dateOfIssue?: string;
    documentType?: string;
    airlineDesignator?: string;
    documentFormSerialNumber?: string;
    selecteeIndicator?: string;
    internationalDocVerification?: string;
    marketingCarrier?: string;
    frequentFlyerAirline?: string;
    frequentFlyerNumber?: string;
    industryDiscount?: string;
    freeBaggageAllowance?: string;
    [key: string]: string | undefined;
  };
  formatted: {
    flight: string;
    seat: string;
    date: string;
    passengerName: string;
    route: string;
    classOfService: string;
    fromAirportFull: string;
    toAirportFull: string;
    airlineFull: string;
  };
}

interface BcbpFieldDefinition {
  id: string;
  label: string;
  length: number;
  description: string;
  validate?: (value: string) => boolean;
  lookup?: Record<string, string>;
}

const MANDATORY_FIELDS_LENGTH = 60;

const BCBP_SCHEMA: BcbpFieldDefinition[] = [
  {
    id: 'formatCode',
    label: 'Format',
    length: 1,
    description: 'Format Code (M = Mandatory)',
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
    validate: (v) => /^\d{1,5}\s*$/.test(v)
  },
  { id: 'julianDate', label: 'Date', length: 3, description: 'Date of Flight (Julian Day 001-366)' },
  {
    id: 'compartment',
    label: 'Class',
    length: 1,
    description: 'Compartment Code (Class of Service)',
    lookup: BCBP_REFERENCE.compartment
  },
  { id: 'seat', label: 'Seat', length: 4, description: 'Seat Number' },
  { id: 'checkInSeq', label: 'Seq', length: 5, description: 'Check-in Sequence Number' },
  {
    id: 'passengerStatus',
    label: 'Status',
    length: 1,
    description: 'Passenger Status',
    lookup: BCBP_REFERENCE.passengerStatus
  },
];

function formatJulianDate(julian: string, year?: number): string {
  const dayOfYear = parseInt(julian, 10);
  if (isNaN(dayOfYear)) return julian;

  const targetYear = year || new Date().getFullYear();
  const date = new Date(targetYear, 0);
  date.setDate(dayOfYear);

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatSeat(seat: string): string {
  return seat.replace(/^0+/, '');
}

function formatFlight(carrier: string, number: string): string {
  return `${carrier.trim()} ${number.trim().replace(/^0+/, '')}`;
}

function formatPassengerName(name: string): string {
  if (name.includes('/')) {
    const [last, first] = name.split('/');
    const toTitleCase = (str: string) => str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    return `${toTitleCase(first)} ${toTitleCase(last)}`;
  }
  return name;
}

function formatClass(code: string): string {
  const c = code.trim().toUpperCase();
  const desc = BCBP_REFERENCE.compartment[c];
  return desc ? `${desc} (${c})` : (c.length > 0 ? `Class ${c}` : '');
}

function getAirportInfo(code: string) {
  const info = AIRPORT_NAMES[code.trim().toUpperCase()];
  if (info) return `${code} - ${info.name} (${info.city})`;
  return code;
}

function getAirlineName(code: string) {
  const name = AIRLINE_NAMES[code.trim().toUpperCase()];
  if (name) return name;
  return code;
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

    const meta: BcbpSegment['meta'] = {};
    if (field.lookup) {
      meta.possibleValues = field.lookup;
      meta.description = field.lookup[value.trim()];
    }

    segments.push({
      id: field.id,
      label: field.label,
      rawValue: value,
      startIndex: cursor,
      endIndex: cursor + field.length,
      description: meta.description || field.description,
      meta,
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
      const condDataEnd = cursor + varSize;

      // Attempt to parse standard unique conditional data
      // Structure often starts with '>' (Field 15) then Ver (Field 16)
      if (raw[cursor] === '>') {
        segments.push({
          id: 'startConditional',
          label: 'Start',
          rawValue: '>',
          startIndex: cursor,
          endIndex: cursor + 1,
          description: 'Start of Conditional Data'
        });
        cursor++;

        // IATA Standard Fields after '>'
        // 16. Ver # (1)
        // 17. Pax Ref (Var)
        // But often it's fixed structure for Versions.
        // Let's do a best-effort robust parse of sequential fields if length allows.

        // Field 16: Version
        if (cursor < condDataEnd) {
             const ver = raw[cursor];
             segments.push({ id: 'version', label: 'Ver', rawValue: ver, startIndex: cursor, endIndex: cursor + 1, description: 'Format Version' });
             cursor++;
        }

        // Variable length fields often follow.
        // Without a strict parser for every version, we look for heuristic matches.

        // Remaining conditional block
        if (cursor < condDataEnd) {
             const remaining = raw.substring(cursor, condDataEnd);

             // Extract Date of Issue (Julian) if possible
             // Often field 22 or nearby. It is 4 digits.
             // We use the previous heuristic: finding 4 digits where 3 are 001-366
             const dateMatch = remaining.match(/(\d{4})/);
             if (dateMatch) {
                 const possibleDate = dateMatch[1];
                 const day = parseInt(possibleDate.substring(0, 3));
                 if (day > 0 && day <= 366) {
                     data.dateOfIssue = possibleDate;
                     const yDigit = parseInt(possibleDate[3], 10);
                     const currentYear = new Date().getFullYear();
                     const currentDecade = Math.floor(currentYear / 10) * 10;
                     dateOfIssueYear = currentDecade + yDigit;

                     // We don't segment it exactly because we aren't sure of position,
                     // but we extract the data value.
                 }
             }

             segments.push({
                 id: 'conditionalContent',
                 label: 'Airline Data',
                 rawValue: remaining,
                 startIndex: cursor,
                 endIndex: condDataEnd,
                 description: 'Variable Length Airline Data'
             });
             cursor = condDataEnd;
        }

      } else {
         // Non-standard or just raw block
         const rawVal = raw.substring(cursor, condDataEnd);

         // Try heuristic extraction of Date of Issue even if not standard structure
         if (rawVal.length >= 8 && /^\d{4}$/.test(rawVal.substring(4, 8))) {
             const dateIssueVal = rawVal.substring(4, 8);
             const day = parseInt(dateIssueVal.substring(0, 3));
             if (day > 0 && day <= 366) {
                 data.dateOfIssue = dateIssueVal;
                 const yDigit = parseInt(dateIssueVal[3], 10);
                 const currentYear = new Date().getFullYear();
                 const currentDecade = Math.floor(currentYear / 10) * 10;
                 dateOfIssueYear = currentDecade + yDigit;
             }
         }

         segments.push({
            id: 'conditionalData',
            label: 'Ext. Data',
            rawValue: rawVal,
            startIndex: cursor,
            endIndex: condDataEnd,
            description: 'Conditional / Airline Data',
         });
         cursor = condDataEnd;
      }
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
    passengerName: formatPassengerName(data.passengerName || ''),
    route: `${data.fromCity} ➝ ${data.toCity}`,
    classOfService: formatClass(data.compartment || ''),
    fromAirportFull: getAirportInfo(data.fromCity || ''),
    toAirportFull: getAirportInfo(data.toCity || ''),
    airlineFull: getAirlineName(data.carrier || ''),
  };

  return {
    raw,
    segments,
    data,
    formatted,
  };
}
