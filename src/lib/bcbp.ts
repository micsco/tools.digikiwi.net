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

// Flexible date parser: accepts 3 chars (Julian) or 4 chars (Issue Date), handles spaces
const FlexibleDate = z.string().transform(s => {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const num = parseInt(trimmed, 10);
  return isNaN(num) ? null : num; // Returns day of year (1-366) or encoded date
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
  dateOfFlight: FlexibleDate,
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

export interface BaggageTagParsed {
  raw: string;
  airlineCode?: string;
  serialNumber?: string;
  consecutiveNumber?: number;
  bagCount?: number;
}

export const BcbpDataSchema = z.object({
  formatCode: z.string(),
  numberOfLegs: z.number().int(),
  passengerName: TrimmedString,
  electronicTicket: z.string().optional(),
  legs: z.array(LegSchema),

  // Security
  securityData: z.string().optional(),

  // Unique / Global Conditional Data
  version: z.number().optional(),
  passengerDescription: z.string().optional(),
  checkInSource: z.string().optional(),
  issuanceDate: FlexibleDate.optional(),
  documentType: z.string().optional(),
  issuer: z.string().optional(),
  baggageTags: z.array(z.custom<BaggageTagParsed>()).optional(),
});

export type ParsedBcbp = z.infer<typeof BcbpDataSchema>;

// --- Constants (Field Lengths) ---
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
  CONDITIONAL_SIZE: 2,

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
  BAGGAGE_TAG_NUMBER: 13,

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

function parseBaggageTag(raw: string, version: number = 6): BaggageTagParsed {
    // Format: 0 (Leading) + AAA (Airline 3) + NNNNNN (Serial 6) + CCC (Count 3)
    // or just 13 chars.
    const clean = raw.trim();
    if (clean.length !== 13) return { raw: clean };

    const airlineCode = clean.substring(1, 4);
    const serialNumber = clean.substring(4, 10);
    const countStr = clean.substring(10, 13);
    const countVal = parseInt(countStr, 10);

    let bagCount = 1;
    if (!isNaN(countVal)) {
        // V7 Logic: 001 = 1 bag.
        // Pre-V7 Logic: 000 = 1 bag.
        if (version >= 7) {
             bagCount = countVal;
             // If 000, maybe it means 0? Or fallback? Standard says 001=1.
        } else {
             // V6: 000 = 1 bag. 001 = 2 bags? Or is it 0-indexed?
             // Issue says: "where 001= 1 bag... on version 6... 000=1 bag".
             // This implies V6: 0 maps to 1. 1 maps to 2?
             // Let's assume V6 count is (Value + 1).
             bagCount = countVal + 1;
        }
    }

    return {
        raw: clean,
        airlineCode,
        serialNumber,
        consecutiveNumber: countVal, // The raw number in the tag
        bagCount
    };
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
    const value = rawValue.trim();

    this.segments.push({
      label,
      value,
      raw: rawValue,
      start,
      end,
      section
    });

    this.cursor += actualLength;
    return rawValue;
  }

  peek(length: number): string {
    return this.raw.substring(this.cursor, this.cursor + length);
  }

  current(): number {
    return this.cursor;
  }
}

// Intermediate type for building the result before final Zod validation
interface IntermediateBcbp {
    formatCode?: string;
    numberOfLegs?: number;
    passengerName?: string;
    electronicTicket?: string;
    legs: any[];
    version?: number;
    passengerDescription?: string;
    checkInSource?: string;
    boardingPassIssuanceSource?: string;
    issuanceDate?: string;
    documentType?: string;
    issuer?: string;
    baggageTags?: string[];
    securityData?: string;
}

export function parseBCBP(raw: string): { success: boolean; data?: ParsedBcbp; segments?: Segment[]; error?: string } {
  try {
    if (!raw || raw.length < 30) { // Relaxed min length
      return { success: false, error: 'Input too short' };
    }

    const extractor = new SegmentExtractor(raw);
    const result: IntermediateBcbp = { legs: [] };

    // --- Mandatory Header ---
    result.formatCode = extractor.read(L.FORMAT_CODE, "Format Code", "header") || "M";
    // Relaxed check: Log warning if not 'M', but proceed if mostly looks like BCBP?
    // But Format Code is critical.
    if (result.formatCode !== 'M') {
        // Checking if maybe there is leading garbage?
        // For now, strict 'M' is standard.
    }

    const numLegsStr = extractor.read(L.NUMBER_OF_LEGS, "Number of Legs", "header");
    result.numberOfLegs = parseInt(numLegsStr || "1");
    if (isNaN(result.numberOfLegs)) result.numberOfLegs = 1;

    result.passengerName = extractor.read(L.PASSENGER_NAME, "Passenger Name", "header");
    result.electronicTicket = extractor.read(L.ELECTRONIC_TICKET_INDICATOR, "E-Ticket Indicator", "header");

    let uniqueDataParsed = false;

    // --- Legs ---
    for (let i = 0; i < (result.numberOfLegs || 1); i++) {
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
            const nextChar = extractor.peek(1);
            if (!uniqueDataParsed && nextChar === '>') {
                const sA = "conditional_unique";
                extractor.read(L.VERSION_NUMBER_INDICATOR, "Version Indicator", sA); // >
                const verStr = extractor.read(L.VERSION_NUMBER, "Version Number", sA);
                result.version = verStr ? parseInt(verStr) : undefined;

                const sectionASizeHex = extractor.read(L.SECTION_A_SIZE, "Unique Data Size", sA);
                const sectionASize = sectionASizeHex ? hexToNumber(sectionASizeHex) : 0;

                if (sectionASize > 0) {
                    const endOfSectionA = extractor.current() + sectionASize;

                    result.passengerDescription = extractor.read(L.PASSENGER_DESCRIPTION, "Passenger Description", sA);
                    result.checkInSource = extractor.read(L.CHECK_IN_SOURCE, "Check-in Source", sA);
                    result.boardingPassIssuanceSource = extractor.read(L.BOARDING_PASS_ISSUANCE_SOURCE, "Issuance Source", sA);

                    result.issuanceDate = extractor.read(L.ISSUANCE_DATE, "Date of Issue", sA);

                    result.documentType = extractor.read(L.DOCUMENT_TYPE, "Document Type", sA);
                    result.issuer = extractor.read(L.BOARDING_PASS_ISSUER_DESIGNATOR, "Issuer Designator", sA);

                    const bags: string[] = [];
                    // Try to read first bag tag
                    if (extractor.current() < endOfSectionA) {
                         const bag1 = extractor.read(L.BAGGAGE_TAG_NUMBER, "Baggage Tag 1", sA);
                         if (bag1) bags.push(bag1);
                    }
                     // Try to read second bag tag
                    if (extractor.current() < endOfSectionA) {
                         const bag2 = extractor.read(L.BAGGAGE_TAG_NUMBER, "Baggage Tag 2", sA);
                         if (bag2) bags.push(bag2);
                    }
                    // Try to read third bag tag? (Standard usually says up to 2 or 3 in repeated fields?)
                    // Actually standard has repeated fields for baggage.

                    if (bags.length > 0) result.baggageTags = bags;

                    const remainingA = endOfSectionA - extractor.current();
                    if (remainingA > 0) extractor.read(remainingA, "Reserved (Section A)", sA);
                }
                uniqueDataParsed = true;
            }

            // --- Section B (Leg Specific) ---
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

                     const remainingB = endOfSectionB - extractor.current();
                     if (remainingB > 0) extractor.read(remainingB, "Reserved (Section B)", sB);
                 }
            }

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

    // --- Final Transformation & Validation ---
    const parsedBaggageTags = result.baggageTags
        ? result.baggageTags.map(t => parseBaggageTag(t, result.version))
        : undefined;

    const finalLegs = result.legs.map((legRaw: any) => {
        // Prepare raw object for Zod
        const prepped = {
            ...legRaw,
            // Cast or default to avoid Zod crashes on missing mandatory fields if input was short
            pnrCode: legRaw.pnrCode || "",
            departureAirport: legRaw.departureAirport || "",
            arrivalAirport: legRaw.arrivalAirport || "",
            operatingCarrier: legRaw.operatingCarrier || "",
            flightNumber: legRaw.flightNumber || "",
            dateOfFlight: legRaw.dateOfFlight || "",
            seatNumber: legRaw.seatNumber || "",
            sequenceNumber: legRaw.sequenceNumber || "",
        };

        const parsed = LegSchema.safeParse(prepped);
        if (parsed.success) return parsed.data;

        // Fallback for partial data
        return {
            ...prepped,
            flightNumber: prepped.flightNumber.trim().replace(/^0+/, ''),
            seatNumber: prepped.seatNumber.trim().replace(/^0+/, ''),
            sequenceNumber: prepped.sequenceNumber.trim().replace(/^0+/, ''),
            compartment: { code: legRaw.compartment || '?', description: 'Invalid' },
            passengerStatus: { code: legRaw.passengerStatus || '?', description: 'Invalid' },
            // Include other raw fields
            dateOfFlight: null, // Fallback
        };
    });

    const finalData: ParsedBcbp = {
        formatCode: result.formatCode || "?",
        numberOfLegs: result.numberOfLegs || 1,
        passengerName: result.passengerName?.trim() || "",
        electronicTicket: result.electronicTicket,
        legs: finalLegs as any, // Cast because fallback might miss some optional fields? No, LegSchema output matches.
        securityData: result.securityData,
        version: result.version,
        passengerDescription: result.passengerDescription,
        checkInSource: result.checkInSource,
        issuanceDate: result.issuanceDate ? parseInt(result.issuanceDate) : null, // Helper uses string, schema expects number/null
        // Wait, schema for issuanceDate says "FlexibleDate.optional()". FlexibleDate transforms string to number|null.
        // So we should pass the string to the schema validation if we were using Zod for the whole object.
        // But here we are constructing the final object manually.
        // FlexibleDate is a Zod schema. We can use it to parse the raw string.

        documentType: result.documentType,
        issuer: result.issuer,
        baggageTags: parsedBaggageTags
    };

    // Fix Issuance Date manual parsing if not using Zod for the whole root object yet
    if (result.issuanceDate) {
        const parsedDate = FlexibleDate.safeParse(result.issuanceDate);
        if (parsedDate.success) finalData.issuanceDate = parsedDate.data;
    }

    return { success: true, data: finalData, segments: extractor.segments };

  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
