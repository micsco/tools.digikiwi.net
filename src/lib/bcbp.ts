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
     * Julian day of year of the flight, as encoded in the BCBP (3‑digit day-of-year, e.g. "032").
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
 * details) from the mandatory section of the BCBP.
 *
 * @param raw - The full BCBP string as read from a boarding pass (e.g., from a barcode).
 * @returns A {@link ParsedBcbp} object containing parsed segments and extracted data, or
 * `null` if the input fails validation or cannot be parsed.
 */
export function parseBcbp(raw: string): ParsedBcbp | null {
  if (!raw || raw.length < 60) return null;

  // Basic BCBP structural validation based on standard field layout.
  // 0: Format Code (1) - Must be 'M' for multiple leg (standard)
  if (raw[0] !== 'M') {
    return null;
  }

  // Offsets derived from the BCBP mandatory section:
  // 30-32: From City Airport Code (3)
  // 33-35: To City Airport Code (3)
  // 36-38: Operating Carrier Designator (3)
  // 39-43: Flight Number (5)

  const fromCityField = raw.substring(30, 33);
  const toCityField = raw.substring(33, 36);
  const carrierField = raw.substring(36, 39);
  const flightNumberField = raw.substring(39, 44);

  const airportCodeRegex = /^[A-Z]{3}\s*$/; // Allow trailing spaces if any (though usually 3 chars)
  const carrierRegex = /^[A-Z0-9]{2,3}\s*$/;
  // Flight number can have spaces
  const flightNumberRegex = /^[0-9A-Z ]{1,5}$/;

  if (
    !airportCodeRegex.test(fromCityField.trimEnd()) ||
    !airportCodeRegex.test(toCityField.trimEnd()) ||
    !carrierRegex.test(carrierField.trimEnd()) ||
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
  let cursor = 0;

  function addSegment(id: string, label: string, length: number, desc: string) {
    const value = raw.substring(cursor, cursor + length);
    segments.push({
      id,
      label,
      rawValue: value,
      startIndex: cursor,
      endIndex: cursor + length,
      description: desc,
    });

    // Populate data object for known fields
    if (id === 'passengerName') data.passengerName = value.trim();
    if (id === 'pnr') data.pnr = value.trim();
    if (id === 'fromCity') data.fromCity = value.trim();
    if (id === 'toCity') data.toCity = value.trim();
    if (id === 'carrier') data.carrier = value.trim();
    if (id === 'flightNumber') data.flightNumber = value.trim();
    if (id === 'julianDate') data.julianDate = value.trim();
    if (id === 'seat') data.seat = value.trim();
    if (id === 'checkInSeq') data.checkInSeq = value.trim();
    if (id === 'passengerStatus') data.passengerStatus = value.trim();

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

  // Conditional items
  if (cursor + 2 <= raw.length) {
       addSegment('varSize', 'Size', 2, 'Length of conditional data');
  }

  return {
    raw,
    segments,
    data,
  };
}
