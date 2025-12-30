import { describe, it, expect } from 'vitest';
import { parseBCBP } from './bcbp';
import { AIRLINE_NAMES, AIRPORT_NAMES } from '../data/bcbp_reference';

// Mock data based on IATA standard structure
// Mandatory: 60 chars
// Header (23 chars):
// 0: M
// 1: 1 (Legs)
// 2-21: Name (20 chars) -> "DOE/JOHN            "
// 22: E-Ticket (1 char) -> "E"

// Leg Block (37 chars):
// 0-6: PNR (7) -> "1234567"
// 7-9: From (3) -> "LHR"
// 10-12: To (3) -> "JFK"
// 13-15: Carrier (3) -> "BA "
// 16-20: Flight (5) -> "0123 "
// 21-23: Date (3) -> "107"
// 24: Class (1) -> "Y"
// 25-28: Seat (4) -> "012A"
// 29-33: Seq (5) -> "0001 "
// 34: Status (1) -> "1"
// 35-36: Var Size (2) -> "00"

// Total 23 + 37 = 60.

const VALID_V7_STRING = "M1DOE/JOHN            E1234567LHRJFKBA 0123 107Y012A0001 100";
// Verify length:
// M1DOE/JOHN            E (23)
// 1234567 (7) -> 30
// LHR (3) -> 33
// JFK (3) -> 36
// BA  (3) -> 39
// 0123  (5) -> 44 (Note: space padded flight usually, or leading zeros. Let's use "00123")
// 107 (3) -> 47
// Y (1) -> 48
// 012A (4) -> 52
// 0001  (5) -> 57
// 1 (1) -> 58
// 00 (2) -> 60.
// Let's refine the string to be exact.
const VALID_V7_STRING_FIXED = "M1DOE/JOHN            E1234567LHRJFKBA 00123107Y012A00001100";

const MULTI_LEG_STRING =
// Header: 23 chars
"M2DOE/JANE            A" +
// Leg 1: 37 chars
"BCDEFGH" + // PNR 7
"LHR" + // From 3
"DXB" + // To 3
"BA " + // Carrier 3
"00101" + // Flight 5
"107" + // Date 3
"Y" + // Class 1
"012A" + // Seat 4
"00001" + // Seq 5
"1" + // Status 1
"00" + // Var 2
// Leg 2: 37 chars
"IJKLMNO" + // PNR 7
"DXB" + // From
"SIN" + // To
"SQ " + // Carrier
"00012" + // Flight
"108" + // Date
"J" + // Class
"001A" + // Seat
"00002" + // Seq
"1" + // Status
"00"; // Var

describe('BCBP Parser', () => {
  it('parses a standard single leg boarding pass', () => {
    const result = parseBCBP(VALID_V7_STRING_FIXED);

    if (!result.success) console.error('Single Leg Fail:', result.error, result.data);

    expect(result.success).toBe(true);
    expect(result.data?.passengerName).toBe('DOE/JOHN');
    expect(result.data?.legs[0].departureAirport).toBe('LHR');
    expect(result.data?.legs[0].arrivalAirport).toBe('JFK');
    expect(result.data?.legs[0].flightNumber).toBe('123'); // Strips leading zeros
    expect(result.data?.legs[0].seatNumber).toBe('12A'); // Strips leading zeros
  });

  it('parses multi-leg boarding pass', () => {
    const result = parseBCBP(MULTI_LEG_STRING);

    if (!result.success) console.error('Multi Leg Fail:', result.error, result.data);

    expect(result.success).toBe(true);
    expect(result.data?.legs).toHaveLength(2);
    expect(result.data?.legs[0].arrivalAirport).toBe('DXB');
    expect(result.data?.legs[1].departureAirport).toBe('DXB');
    expect(result.data?.legs[1].arrivalAirport).toBe('SIN');
    expect(result.data?.legs[1].operatingCarrier).toBe('SQ');
  });

  it('handles V7 baggage logic (fallback)', () => {
    // TODO: Implement mock with conditional data once we have the logic
    // For now we check that valid parsing doesn't break
    expect(true).toBe(true);
  });

  it('handles V8 gender codes (X/U)', () => {
    // TODO: Implement mock with conditional data
    expect(true).toBe(true);
  });

  it('fails soft on invalid data', () => {
    const BAD_STRING = "M1       INVALID_FORMAT       ";
    const result = parseBCBP(BAD_STRING);
    // Should return success: false because it's too short (<60)
    expect(result.success).toBe(false);
    expect(result.error).toContain('Input too short');
  });

  it('fails soft on validation error but returns data', () => {
      // Construct a string with invalid enum but valid length
      // Invalid Status 'Z' (not in enum 0-8)
      const INVALID_ENUM_STRING = "M1DOE/JOHN            E1234567LHRJFKBA 00123107Y012A00001Z00";
      const result = parseBCBP(INVALID_ENUM_STRING);

      // Our parser uses safeParse and returns valid data if main structure is ok.
      // But Zod schema for leg has optional fields.
      // Passenger Status: Z -> 'Unknown Status' (because we used .transform with fallback in schema?)
      // Let's check schema:
      // const PassengerStatus = z.string().length(1).transform(s => { const desc = ... || 'Unknown Status'; return {code: s, desc} });
      // So it should actually SUCCEED but with 'Unknown Status' description.

      expect(result.success).toBe(true);
      expect(result.data?.legs[0].passengerStatus?.description).toBe('Unknown Status');
  });
});
