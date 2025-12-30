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

export function parseBcbp(raw: string): ParsedBcbp | null {
  if (!raw || raw.length < 60) return null; // Minimal validation

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
