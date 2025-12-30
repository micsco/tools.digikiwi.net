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
    [key: string]: string;
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
    // While some implementations might use alphanumerics, strict IATA compliance implies digits.
    validate: (v) => /^\d{1,5}\s*$/.test(v)
  },
  { id: 'julianDate', label: 'Date', length: 3, description: 'Date of Flight (Julian)' },
  { id: 'compartment', label: 'Class', length: 1, description: 'Compartment Code' },
  { id: 'seat', label: 'Seat', length: 4, description: 'Seat Number' },
  { id: 'checkInSeq', label: 'Seq', length: 5, description: 'Check-in Sequence' },
  { id: 'passengerStatus', label: 'Status', length: 1, description: 'Passenger Status' },
];

/**
 * Parses a raw IATA Bar Coded Boarding Pass (BCBP) string into a structured representation.
 *
 * The parser extracts both low-level segment information (field positions and raw values)
 * and high-level data fields (such as passenger name, PNR, routing, carrier, and flight
 * details) from the mandatory section of the BCBP.
 *
 * It performs basic structural/format validation of these fields (e.g., checking that
 * airport codes are 3 letters). Callers should treat a `null` result as an invalid or
 * unsupported BCBP string.
 *
 * @param raw - The full BCBP string as read from a boarding pass (e.g., from a barcode).
 * @returns A {@link ParsedBcbp} object containing parsed segments and extracted data, or
 * `null` if the input fails validation or cannot be parsed.
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

  // Iterate over schema to validate and parse simultaneously
  for (const field of BCBP_SCHEMA) {
    // Safety check: ensure we don't read past end of string (though length check above handles most)
    if (cursor + field.length > raw.length) return null;

    const value = raw.substring(cursor, cursor + field.length);

    // Run validation if defined
    if (field.validate && !field.validate(value)) {
      return null;
    }

    // Add segment
    segments.push({
      id: field.id,
      label: field.label,
      rawValue: value,
      startIndex: cursor,
      endIndex: cursor + field.length,
      description: field.description,
    });

    // Populate data object
    // Note: We trim values for the data object for cleaner usage
    if (field.id in data) {
      data[field.id] = value.trim();
    }

    cursor += field.length;
  }

  // Conditional items (Size of variable field)
  // This checks for the existence of the "Size of variable size field"
  // which follows the mandatory block.
  if (cursor + 2 <= raw.length) {
       const value = raw.substring(cursor, cursor + 2);
       segments.push({
         id: 'varSize',
         label: 'Size',
         rawValue: value,
         startIndex: cursor,
         endIndex: cursor + 2,
         description: 'Length of conditional data',
       });
  }

  return {
    raw,
    segments,
    data,
  };
}
