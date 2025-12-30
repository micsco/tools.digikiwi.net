import { z } from 'zod';
import { BCBP_REFERENCE } from '../data/bcbp_reference';

// --- Types ---

export interface Segment {
  label: string;
  value: string; // The parsed/trimmed value
  raw: string;   // The raw string from the barcode
  start: number;
  end: number;
  section: 'header' | 'leg_mandatory' | 'conditional_unique' | 'conditional_leg' | 'security';
}

// --- Zod Schemas ---

const TrimmedString = z.string().transform(s => s.trim());
const JulianDate = z.string().length(3).transform(s => {
  const day = parseInt(s, 10);
  return isNaN(day) ? null : day;
}).nullable();

const CompartmentCode = z.string().length(1).transform(c => {
  const desc = BCBP_REFERENCE.compartment[c] || 'Unknown Class';
  return { code: c, description: desc };
});

const PassengerStatus = z.string().length(1).transform(s => {
  const desc = BCBP_REFERENCE.passengerStatus[s] || 'Unknown Status';
  return { code: s, description: desc };
});

export const GenderSchema = z.enum(['M', 'F', 'X', 'U']).catch('U');

export const LegSchema = z.object({
  pnrCode: TrimmedString,
  departureAirport: TrimmedString,
  arrivalAirport: TrimmedString,
  operatingCarrier: TrimmedString,
  flightNumber: TrimmedString.transform(s => s.replace(/^0+/, '')),
  dateOfFlight: JulianDate,
  compartment: CompartmentCode.optional(),
  seatNumber: TrimmedString.transform(s => s.replace(/^0+/, '')),
  sequenceNumber: TrimmedString.transform(s => s.replace(/^0+/, '')),
  passengerStatus: PassengerStatus.optional(),

  // Conditional / Optional Fields
  airlineNumericCode: z.string().optional(),
  serialNumber: z.string().optional(),
  selecteeIndicator: z.string().optional(),
  internationalDocVerification: z.string().optional(),
  marketingCarrier: z.string().optional(),
  frequentFlyerAirline: z.string().optional(),
  frequentFlyerNumber: z.string().optional(),
  idIndicator: z.string().optional(),
  freeBaggageAllowance: z.string().optional(),
  fastTrack: z.boolean().optional(),
});

export const BcbpDataSchema = z.object({
  formatCode: z.string(),
  numberOfLegs: z.number().int(),
  passengerName: TrimmedString,
  electronicTicket: z.string().optional(),
  legs: z.array(LegSchema),

  // Security
  securityData: z.string().optional(),

  // Unique / Global Conditional Data (usually from first leg)
  version: z.number().optional(),
  passengerDescription: z.string().optional(),
  checkInSource: z.string().optional(),
  issuanceDate: z.date().optional().nullable(), // We might store as Date or string
  documentType: z.string().optional(),
  issuer: z.string().optional(),
  baggageTags: z.array(z.string()).optional(),
});

export type ParsedBcbp = z.infer<typeof BcbpDataSchema>;

// --- Constants (Field Lengths) ---
// Based on IATA Res 792 and georgesmith46/bcbp implementation
const L = {
  FORMAT_CODE: 1,
  NUMBER_OF_LEGS: 1,
  PASSENGER_NAME: 20,
  ELECTRONIC_TICKET_INDICATOR: 1,
  // Leg Mandatory
  OPERATING_CARRIER_PNR: 7,
  DEPARTURE_AIRPORT: 3,
  ARRIVAL_AIRPORT: 3,
  OPERATING_CARRIER_DESIGNATOR: 3,
  FLIGHT_NUMBER: 5,
  FLIGHT_DATE: 3,
  COMPARTMENT_CODE: 1,
  SEAT_NUMBER: 4,
  CHECK_IN_SEQUENCE_NUMBER: 5,
  PASSENGER_STATUS: 1,
  // Conditional Header
  CONDITIONAL_SIZE: 2, // Hex size of conditional block

  // Conditional Section A (Unique)
  VERSION_NUMBER_INDICATOR: 1, // '>'
  VERSION_NUMBER: 1,
  SECTION_A_SIZE: 2, // Hex
  PASSENGER_DESCRIPTION: 1,
  CHECK_IN_SOURCE: 1,
  BOARDING_PASS_ISSUANCE_SOURCE: 1,
  ISSUANCE_DATE: 4,
  DOCUMENT_TYPE: 1,
  BOARDING_PASS_ISSUER_DESIGNATOR: 3,
  BAGGAGE_TAG_NUMBER: 13, // Repeated 3 times?

  // Conditional Section B (Leg)
  SECTION_B_SIZE: 2, // Hex
  AIRLINE_NUMERIC_CODE: 3,
  SERIAL_NUMBER: 10,
  SELECTEE_INDICATOR: 1,
  INTERNATIONAL_DOC_VERIF: 1,
  MARKETING_CARRIER: 3,
  FREQ_FLYER_AIRLINE: 3,
  FREQ_FLYER_NUMBER: 16,
  ID_INDICATOR: 1,
  FREE_BAGGAGE_ALLOWANCE: 3,
  FAST_TRACK: 1,

  // Security
  SECURITY_DATA_INDICATOR: 1, // '^'
  SECURITY_DATA_TYPE: 1,
  SECURITY_SIZE: 2, // Hex
};

// --- Helper Functions ---

function hexToNumber(hex: string): number {
  const val = parseInt(hex, 16);
  return isNaN(val) ? 0 : val;
}

function dayOfYearToDate(dayStr: string, yearPrefix: boolean, refYear?: number): Date | null {
   // Simplified for now, similar to existing JulianDate transform but returns Date object
   // '123' -> 123rd day of current year
   // If yearPrefix is true, format is likely 'YDDD'? Or 'YYYY'?
   // georgesmith46 says ISSUANCE_DATE is 4 chars. Julian Date is 3.
   // Wait, ISSUANCE_DATE length is 4. Usually 'YDDD'?
   // Example: '0123' -> 2020 (0) day 123?
   // Let's assume 'YDDD' where Y is last digit of year.
   // Or just return raw string if unsure?
   // georgesmith46: `dayOfYearToDate(value, true, refYear)`
   // Let's return null if parsing fails, or just handle basic 3-digit DOY for now.
   return null;
}

// --- Parser Logic ---

class SegmentExtractor {
  raw: string;
  cursor: number = 0;
  segments: Segment[] = [];

  constructor(raw: string) {
    this.raw = raw;
  }

  // Reads a fixed length field
  read(length: number, label: string, section: Segment['section']): string | undefined {
    if (this.cursor >= this.raw.length) return undefined;

    // "Fail soft": if remaining length < requested, read what's left
    const actualLength = Math.min(length, this.raw.length - this.cursor);
    if (actualLength <= 0) return undefined;

    const start = this.cursor;
    const end = start + actualLength;
    const rawValue = this.raw.substring(start, end);
    const value = rawValue.trim(); // Default trim for value

    this.segments.push({
      label,
      value: value, // Store trimmed value for display
      raw: rawValue,
      start,
      end,
      section
    });

    this.cursor += actualLength;

    // Return original raw value (preserving spaces) or undefined?
    // Usually we want the raw string for logic, trimmed for value.
    // Let's return the raw string so logic (like Hex parse) works.
    return rawValue;
  }

  // Peeks at next chars without advancing
  peek(length: number): string {
    return this.raw.substring(this.cursor, this.cursor + length);
  }

  current(): number {
    return this.cursor;
  }

  advance(count: number) {
      this.cursor += count;
  }
}

export function parseBCBP(raw: string): { success: boolean; data?: ParsedBcbp; segments?: Segment[]; error?: string } {
  try {
    if (!raw || raw.length < 60) {
      return { success: false, error: 'Input too short' };
    }

    const extractor = new SegmentExtractor(raw);
    const result: any = { legs: [] }; // Intermediate object to match BcbpDataSchema input shape

    // --- Mandatory Header ---
    result.formatCode = extractor.read(L.FORMAT_CODE, "Format Code", "header") || "M";
    if (result.formatCode !== 'M') return { success: false, error: "Invalid Format Code" };

    const numLegsStr = extractor.read(L.NUMBER_OF_LEGS, "Number of Legs", "header");
    result.numberOfLegs = parseInt(numLegsStr || "1");

    result.passengerName = extractor.read(L.PASSENGER_NAME, "Passenger Name", "header");
    result.electronicTicket = extractor.read(L.ELECTRONIC_TICKET_INDICATOR, "E-Ticket Indicator", "header");

    let uniqueDataParsed = false;

    // --- Legs ---
    for (let i = 0; i < result.numberOfLegs; i++) {
        const leg: any = {};
        const s = "leg_mandatory";

        leg.pnrCode = extractor.read(L.OPERATING_CARRIER_PNR, "PNR Code", s);
        leg.departureAirport = extractor.read(L.DEPARTURE_AIRPORT, "Departure Airport", s);
        leg.arrivalAirport = extractor.read(L.ARRIVAL_AIRPORT, "Arrival Airport", s);
        leg.operatingCarrier = extractor.read(L.OPERATING_CARRIER_DESIGNATOR, "Operating Carrier", s);
        leg.flightNumber = extractor.read(L.FLIGHT_NUMBER, "Flight Number", s);
        leg.dateOfFlight = extractor.read(L.FLIGHT_DATE, "Date of Flight", s);
        leg.compartment = extractor.read(L.COMPARTMENT_CODE, "Compartment Code", s);
        leg.seatNumber = extractor.read(L.SEAT_NUMBER, "Seat Number", s);
        leg.sequenceNumber = extractor.read(L.CHECK_IN_SEQUENCE_NUMBER, "Sequence Number", s);
        leg.passengerStatus = extractor.read(L.PASSENGER_STATUS, "Passenger Status", s);

        // Conditional Block Size
        const conditionalSizeHex = extractor.read(L.CONDITIONAL_SIZE, "Conditional Data Size", s);
        const conditionalSize = conditionalSizeHex ? hexToNumber(conditionalSizeHex) : 0;

        if (conditionalSize > 0) {
            const startOfConditional = extractor.current();
            const endOfConditional = startOfConditional + conditionalSize;

            // --- Section A (Unique) ---
            // Only parse unique data if not yet parsed AND we have enough room
            // Heuristic: Check if starts with '>' (Version Indicator)
            const nextChar = extractor.peek(1);
            if (!uniqueDataParsed && nextChar === '>') {
                const sA = "conditional_unique";
                extractor.read(L.VERSION_NUMBER_INDICATOR, "Version Indicator", sA); // >
                const verStr = extractor.read(L.VERSION_NUMBER, "Version Number", sA);
                result.version = verStr ? parseInt(verStr) : undefined;

                const sectionASizeHex = extractor.read(L.SECTION_A_SIZE, "Unique Data Size", sA);
                const sectionASize = sectionASizeHex ? hexToNumber(sectionASizeHex) : 0;

                if (sectionASize > 0) {
                    // Extract Section A fields
                    // We must respect the sectionASize limit
                    const endOfSectionA = extractor.current() + sectionASize;

                    result.passengerDescription = extractor.read(L.PASSENGER_DESCRIPTION, "Passenger Description", sA);
                    result.checkInSource = extractor.read(L.CHECK_IN_SOURCE, "Check-in Source", sA);
                    result.boardingPassIssuanceSource = extractor.read(L.BOARDING_PASS_ISSUANCE_SOURCE, "Issuance Source", sA);

                    const issueDateStr = extractor.read(L.ISSUANCE_DATE, "Date of Issue", sA);
                    // TODO: Parse date

                    result.documentType = extractor.read(L.DOCUMENT_TYPE, "Document Type", sA);
                    result.issuer = extractor.read(L.BOARDING_PASS_ISSUER_DESIGNATOR, "Issuer Designator", sA);

                    const bags: string[] = [];
                    const bag1 = extractor.read(L.BAGGAGE_TAG_NUMBER, "Baggage Tag 1", sA);
                    if (bag1) bags.push(bag1);
                    const bag2 = extractor.read(L.FIRST_BAGGAGE_TAG_NUMBER, "Baggage Tag 2", sA);
                    if (bag2) bags.push(bag2);
                    const bag3 = extractor.read(L.SECOND_BAGGAGE_TAG_NUMBER, "Baggage Tag 3", sA);
                    if (bag3) bags.push(bag3);

                    if (bags.length > 0) result.baggageTags = bags;

                    // Skip any remaining bytes in Section A (forward compatibility)
                    const remainingA = endOfSectionA - extractor.current();
                    if (remainingA > 0) extractor.read(remainingA, "Reserved (Section A)", sA);
                }
                uniqueDataParsed = true;
            }

            // --- Section B (Leg Specific) ---
            // After Section A (if present), or immediately if no Section A
            // But wait, if we are inside `conditionalSize`, checking `endOfConditional` is key.
            if (extractor.current() < endOfConditional) {
                 const sB = "conditional_leg";
                 const sectionBSizeHex = extractor.read(L.SECTION_B_SIZE, "Leg Data Size", sB);
                 const sectionBSize = sectionBSizeHex ? hexToNumber(sectionBSizeHex) : 0;

                 if (sectionBSize > 0) {
                     const endOfSectionB = extractor.current() + sectionBSize;

                     leg.airlineNumericCode = extractor.read(L.AIRLINE_NUMERIC_CODE, "Airline Numeric Code", sB);
                     leg.serialNumber = extractor.read(L.SERIAL_NUMBER, "Document Serial Num", sB);
                     leg.selecteeIndicator = extractor.read(L.SELECTEE_INDICATOR, "Selectee Indicator", sB);
                     leg.internationalDocVerification = extractor.read(L.INTERNATIONAL_DOC_VERIF, "Intl Doc Verification", sB);
                     leg.marketingCarrier = extractor.read(L.MARKETING_CARRIER, "Marketing Carrier", sB);
                     leg.frequentFlyerAirline = extractor.read(L.FREQ_FLYER_AIRLINE, "Frequent Flyer Airline", sB);
                     leg.frequentFlyerNumber = extractor.read(L.FREQ_FLYER_NUMBER, "Frequent Flyer Number", sB);
                     leg.idIndicator = extractor.read(L.ID_INDICATOR, "ID Adherence", sB);
                     leg.freeBaggageAllowance = extractor.read(L.FREE_BAGGAGE_ALLOWANCE, "Free Baggage Allowance", sB);
                     const ft = extractor.read(L.FAST_TRACK, "Fast Track", sB);
                     if (ft) leg.fastTrack = (ft === 'Y');

                     // Skip remaining Section B
                     const remainingB = endOfSectionB - extractor.current();
                     if (remainingB > 0) extractor.read(remainingB, "Reserved (Section B)", sB);
                 }
            }

            // Skip any remaining bytes in Conditional Block (e.g. padding or airline specific)
            const remainingCond = endOfConditional - extractor.current();
            if (remainingCond > 0) {
                extractor.read(remainingCond, "Airline Use / Reserved", "conditional_leg");
            }
        }

        result.legs.push(leg);
    }

    // --- Security Data ---
    const secInd = extractor.peek(1);
    if (secInd === '^') {
        const sSec = "security";
        extractor.read(L.SECURITY_DATA_INDICATOR, "Security Indicator", sSec); // ^
        extractor.read(L.SECURITY_DATA_TYPE, "Security Type", sSec);

        const secSizeHex = extractor.read(L.SECURITY_SIZE, "Security Data Size", sSec);
        const secSize = secSizeHex ? hexToNumber(secSizeHex) : 0;

        if (secSize > 0) {
            result.securityData = extractor.read(secSize, "Security Data", sSec);
        }
    }

    // --- Validation & Transformation ---
    // Now we have a raw object `result` that looks like the input expected by BcbpDataSchema,
    // BUT the fields are strings (or arrays of strings).
    // Our Zod schema expects strings and transforms them.
    // However, some fields in `result` are already Numbers (numberOfLegs) or Arrays (baggageTags).
    // We need to adjust the schema or the object.

    // Actually, BcbpDataSchema expects `numberOfLegs` to be number.
    // And `legs` to be array of objects.

    // We can rely on Zod to validate the structure.
    // We need to make sure the inputs match the schema expectations.

    // We'll perform a "safeParse" manually for legs to handle the "fail-soft" logic again.
    const finalLegs = result.legs.map((legRaw: any) => {
        const parsed = LegSchema.safeParse(legRaw);
        if (parsed.success) return parsed.data;
        // Fail soft: return raw values cast to type
        return {
            ...legRaw,
            pnrCode: legRaw.pnrCode?.trim(),
            flightNumber: legRaw.flightNumber?.trim().replace(/^0+/, ''),
            seatNumber: legRaw.seatNumber?.trim().replace(/^0+/, ''),
            sequenceNumber: legRaw.sequenceNumber?.trim().replace(/^0+/, ''),
            // ... handle others best effort
            compartment: { code: legRaw.compartment, description: 'Invalid' },
            passengerStatus: { code: legRaw.passengerStatus, description: 'Invalid' }
        };
    });

    // Global fields
    const finalData: ParsedBcbp = {
        formatCode: result.formatCode,
        numberOfLegs: result.numberOfLegs,
        passengerName: result.passengerName?.trim(),
        electronicTicket: result.electronicTicket,
        legs: finalLegs,
        securityData: result.securityData,
        version: result.version,
        passengerDescription: result.passengerDescription,
        checkInSource: result.checkInSource,
        issuanceDate: null, // TODO
        documentType: result.documentType,
        issuer: result.issuer,
        baggageTags: result.baggageTags
    };

    return { success: true, data: finalData, segments: extractor.segments };

  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
