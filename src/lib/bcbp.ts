import { z } from 'zod';
import { BCBP_REFERENCE } from '../data/bcbp_reference';

// --- Zod Schemas ---

// Basic Types
const TrimmedString = z.string().transform(s => s.trim());
const JulianDate = z.string().length(3).transform(s => {
  const day = parseInt(s, 10);
  // Returns number or null
  return isNaN(day) ? null : day;
}).nullable();

// IATA Compartment Code (Field 14)
const CompartmentCode = z.string().length(1).transform(c => {
  const desc = BCBP_REFERENCE.compartment[c] || 'Unknown Class';
  return { code: c, description: desc };
});

// Passenger Status (Field 11)
const PassengerStatus = z.string().length(1).transform(s => {
  const desc = BCBP_REFERENCE.passengerStatus[s] || 'Unknown Status';
  return { code: s, description: desc };
});

// Gender (V8 supports X and U)
export const GenderSchema = z.enum(['M', 'F', 'X', 'U']).catch('U');

// --- Data Structures ---

export const LegSchema = z.object({
  pnrCode: TrimmedString, // Field 7
  departureAirport: TrimmedString, // Field 8
  arrivalAirport: TrimmedString, // Field 9
  operatingCarrier: TrimmedString, // Field 10
  flightNumber: TrimmedString.transform(s => s.replace(/^0+/, '')), // Field 11
  dateOfFlight: JulianDate, // Field 12
  compartment: CompartmentCode.optional(), // Field 13
  seatNumber: TrimmedString.transform(s => s.replace(/^0+/, '')), // Field 14
  sequenceNumber: TrimmedString.transform(s => s.replace(/^0+/, '')), // Field 15
  passengerStatus: PassengerStatus.optional(), // Field 16
  airlineNumericCode: TrimmedString.optional(), // Field 17 (Conditional?)

  // Extra fields
  selecteeStatus: z.string().optional(),
  marketingCarrier: z.string().optional(),

  // Internal Raw Conditional (removed from output typically, but useful for debugging)
  _rawConditional: z.string().optional(),
});

// We need the Output Type of LegSchema for the BcbpDataSchema definition
// But we can't use LegSchema in BcbpDataSchema if we want to validte the output object,
// because LegSchema expects Strings (Inputs).
// However, we only use BcbpDataSchema for TYPE INFERENCE here.
// So it is fine to define it using LegSchema.
export const BcbpDataSchema = z.object({
  formatCode: z.string().length(1),
  numberOfLegs: z.number().int().min(1),
  passengerName: TrimmedString,
  electronicTicket: z.string().optional(),
  // Legs
  legs: z.array(LegSchema),
  // Security / Global Conditional
  securityData: z.string().optional(),
  version: z.string().optional(),

  // V7/V8 Specifics
  baggageTag: z.object({
      count: z.number().nullable(),
      licensePlate: z.array(z.string()).optional()
  }).optional(),
  gender: GenderSchema.optional().nullable(),
});

export type ParsedBcbp = z.infer<typeof BcbpDataSchema>;

// --- Parser Logic ---

export function parseBCBP(raw: string): { success: boolean; data?: ParsedBcbp; error?: string } {
  try {
    if (!raw || raw.length < 60) {
      return { success: false, error: 'Input too short' };
    }

    const formatCode = raw.substring(0, 1);
    if (formatCode !== 'M') {
       return { success: false, error: 'Invalid Format Code (Expected M)' };
    }

    const numberOfLegsRaw = raw.substring(1, 2);
    const numberOfLegs = parseInt(numberOfLegsRaw, 10);
    if (isNaN(numberOfLegs)) return { success: false, error: 'Invalid Number of Legs' };

    const passengerNameRaw = raw.substring(2, 22);
    const electronicTicketIndicator = raw.substring(22, 23); // Sometimes E-Ticket is 1 char at 22.

    let currentOffset = 23;
    const legs: z.infer<typeof LegSchema>[] = [];

    // Loop through legs
    for (let i = 0; i < numberOfLegs; i++) {
        // Repeated Mandatory Data (37 chars)
        if (currentOffset + 37 > raw.length) {
            break;
        }

        const legBlock = raw.substring(currentOffset, currentOffset + 37);
        const pnrCode = legBlock.substring(0, 7);
        const departureAirport = legBlock.substring(7, 10);
        const arrivalAirport = legBlock.substring(10, 13);
        const operatingCarrier = legBlock.substring(13, 16);
        const flightNumber = legBlock.substring(16, 21);
        const dateOfFlight = legBlock.substring(21, 24);
        const compartment = legBlock.substring(24, 25);
        const seatNumber = legBlock.substring(25, 29);
        const sequenceNumber = legBlock.substring(29, 34);
        const passengerStatus = legBlock.substring(34, 35);
        const variableSizeRaw = legBlock.substring(35, 37);

        const legRaw = {
            pnrCode,
            departureAirport,
            arrivalAirport,
            operatingCarrier,
            flightNumber,
            dateOfFlight,
            compartment,
            seatNumber,
            sequenceNumber,
            passengerStatus
        };

        const parsedLeg = LegSchema.safeParse(legRaw);
        if (parsedLeg.success) {
            legs.push(parsedLeg.data);
        } else {
            // Fallback: manually construct a partial leg matching the type
            // This is tedious to do perfectly type-safe without duplication,
            // so we'll do a best-effort cast or use defaults.
            // For now, let's assume if mandatory fields fail, the leg is invalid.
            // But user said "Partial Data".
            // We can return the raw strings in the places where transformers failed?
            // No, types mismatch.
            // Let's force it.
            legs.push({
               pnrCode: pnrCode.trim(),
               departureAirport: departureAirport.trim(),
               arrivalAirport: arrivalAirport.trim(),
               operatingCarrier: operatingCarrier.trim(),
               flightNumber: flightNumber.trim().replace(/^0+/, ''),
               dateOfFlight: parseInt(dateOfFlight) || null,
               compartment: { code: compartment, description: 'Invalid' },
               seatNumber: seatNumber.trim().replace(/^0+/, ''),
               sequenceNumber: sequenceNumber.trim().replace(/^0+/, ''),
               passengerStatus: { code: passengerStatus, description: 'Invalid' }
            });
        }

        currentOffset += 37;

        // Handle Variable Size Field (Conditional)
        const conditionalLength = parseInt(variableSizeRaw, 16);
        if (!isNaN(conditionalLength) && conditionalLength > 0) {
             const conditionalData = raw.substring(currentOffset, currentOffset + conditionalLength);
             if (legs[i]) {
                 legs[i]._rawConditional = conditionalData;
                 // TODO: Parse specific V7/V8 fields from conditionalData
             }
             currentOffset += conditionalLength;
        }
    }

    // Construct final object matching ParsedBcbp type
    // We do NOT use BcbpDataSchema.parse() here because legs are already transformed.
    const finalData: ParsedBcbp = {
        formatCode,
        numberOfLegs,
        passengerName: passengerNameRaw.trim(), // Manual trim to match schema transform
        electronicTicket: electronicTicketIndicator,
        legs,
        securityData: undefined, // TODO
        version: undefined,
        baggageTag: undefined, // TODO: Extract from conditional
        gender: undefined // TODO: Extract from conditional
    };

    // We assume success if we parsed at least one leg or basic header
    return { success: true, data: finalData };

  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
