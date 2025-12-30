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
    /**
     * Julian day of year of the flight, as encoded in the BCBP (3-digit day-of-year, e.g. "032").
     * This is intentionally kept as the raw string from the barcode; callers should parse it
     * to a number or convert it to a calendar date as needed.
     */
    julianDate: string;
    seat: string;
    checkInSeq: string;
    passengerStatus: string;
    [key: string]: string;
  };
}

/**
 * Parses a raw IATA Bar Coded Boarding Pass (BCBP) string into a structured representation.
 *
 * The parser extracts both low-level segment information (field positions and raw values)
 * and high-level data fields (such as passenger name, PNR, routing, carrier, and flight
 * details) from the mandatory section of the BCBP. Only minimal validation is performed;
 * callers should treat a `null` result as an invalid or unsupported BCBP string.
 *
 * @param raw - The full BCBP string as read from a boarding pass (e.g., from a barcode).
 * @returns A {@link ParsedBcbp} object containing parsed segments and extracted data, or
 *          `null` if the input fails basic validation or cannot be parsed.
 */
export function parseBcbp(raw: string): ParsedBcbp | null {
  // Basic length validation
  if (!raw || raw.length < 60) return null;

  // Basic BCBP structural validation based on standard field layout.
  // The format code must be 'M' (magnetic/optical BCBP format).
  const formatCode = raw[0];
  if (formatCode !== 'M') {
    return null;
  }

  // Extract key fields for validation (based on BCBP mandatory section offsets)
  // 0: Format Code (1)
  // 1: Number of Legs (1)
  // 2-21: Passenger Name (20)
  // 22: Electronic Ticket Indicator (1)
  // 23-29: PNR Code (7)
  // 30-32: From City Airport Code (3)
  // 33-35: To City Airport Code (3)
  // 36-38: Operating Carrier Designator (3)
  // 39-43: Flight Number (5)
  const fromCityField = raw.substring(30, 33).trim();
  const toCityField = raw.substring(33, 36).trim();
  const carrierField = raw.substring(36, 39).trim();
  const flightNumberField = raw.substring(39, 44).trim();

  // Validate field formats
  const airportCodeRegex = /^[A-Z]{3}$/;
  const carrierRegex = /^[A-Z0-9]{2,3}$/;
  const flightNumberRegex = /^[0-9A-Z]{1,5}$/;

  if (
    !airportCodeRegex.test(fromCityField) ||
    !airportCodeRegex.test(toCityField) ||
    !carrierRegex.test(carrierField) ||
    !flightNumberRegex.test(flightNumberField)
  ) {
    return null;
  }

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

  // BCBP Standard Field Lengths (Mandatory Section)
  // M: Format Code (1)
  // 1: Number of Legs (1)
  // PNAME: Passenger Name (20)
  // E: Electronic Ticket Indicator (1)
  // PNR: PNR Code (7)
  // FROM: From City Airport Code (3)
  // TO: To City Airport Code (3)
  // CARRIER: Operating Carrier Designator (3)
  // FLIGHT: Flight Number (5)
  // DATE: Date of Flight (Julian Date) (3)
  // COMPT: Compartment Code (1)
  // SEAT: Seat Number (4)
  // SEQ: Check-in Sequence Number (5)
  // STATUS: Passenger Status (1)
  // SIZE: Variable Size Field (2) - Hexadecimal length of the following variable size field.

  let cursor = 0;

  // Mapping of segment IDs to data object keys
  const dataFieldMap: Record<string, keyof ParsedBcbp['data']> = {
    passengerName: 'passengerName',
    pnr: 'pnr',
    fromCity: 'fromCity',
    toCity: 'toCity',
    carrier: 'carrier',
    flightNumber: 'flightNumber',
    julianDate: 'julianDate',
    seat: 'seat',
    checkInSeq: 'checkInSeq',
    passengerStatus: 'passengerStatus',
  };

  function addSegment(id: string, label: string, length: number, desc: string) {
    // Some fields are variable length in practice or might be padded with spaces
    // The standard defines fixed widths for the mandatory block
    const value = raw.substring(cursor, cursor + length);
    segments.push({
      id,
      label,
      rawValue: value,
      startIndex: cursor,
      endIndex: cursor + length,
      description: desc,
    });

    // Populate data object for known fields using the mapping
    const dataKey = dataFieldMap[id];
    if (dataKey) {
      data[dataKey] = value.trim();
    }

    cursor += length;
  }

  // Mandatory Items
  addSegment('formatCode', 'Format', 1, 'Format Code (M)');
  addSegment('legs', 'Legs', 1, 'Number of Legs');
  addSegment('passengerName', 'Name', 20, 'Passenger Name');
  addSegment('eticket', 'E-Ticket', 1, 'Electronic Ticket Indicator');
  addSegment('pnr', 'PNR', 7, 'Booking Reference (PNR)');
  addSegment('fromCity', 'From', 3, 'Origin Airport');
  addSegment('toCity', 'To', 3, 'Destination Airport');
  addSegment('carrier', 'Carrier', 3, 'Operating Carrier');
  addSegment('flightNumber', 'Flight', 5, 'Flight Number');
  addSegment('julianDate', 'Date', 3, 'Date of Flight (Julian)');
  addSegment('compartment', 'Class', 1, 'Compartment Code');
  addSegment('seat', 'Seat', 4, 'Seat Number');
  addSegment('checkInSeq', 'Seq', 5, 'Check-in Sequence');
  addSegment('passengerStatus', 'Status', 1, 'Passenger Status');

  // Conditional items (Size of variable field)
  // This is a simplification. The BCBP standard is complex with variable fields.
  // We will grab the size field next to determine if we can parse more, but for this first version,
  // we focus on the mandatory block which covers 90% of user needs.

  // Try to parse variable size field
  if (cursor + 2 <= raw.length) {
       addSegment('varSize', 'Size', 2, 'Length of conditional data');
  }

  return {
    raw,
    segments,
    data,
  };
}
