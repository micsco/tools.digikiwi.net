import { describe, it, expect } from 'vitest';
import { parseBCBP } from './bcbp';

// Mock Strings
const VALID_V7_STRING_FIXED = "M1DOE/JOHN            E1234567LHRJFKBA 00123107Y012A00001100";
const MULTI_LEG_STRING =
"M2DOE/JANE            A" +
// Leg 1 (37 chars)
"BCDEFGH" + "LHR" + "DXB" + "BA " + "00101" + "107" + "Y" + "012A" + "00001" + "1" + "00" +
// Leg 2 (37 chars)
"IJKLMNO" + "DXB" + "SIN" + "SQ " + "00012" + "108" + "J" + "001A" + "00002" + "1" + "00";

// Conditional Data String
// Leg ends with '0A' (10 chars conditional).
// Conditional Data (10 chars):
// 1 char: '>'
// 1 char: '1' (Ver)
// 2 chars: '02' (Sec A Size)
// 2 chars: 'PA' (Pax Desc, CheckIn Src) - Mocking Sec A fields
// 2 chars: '00' (Sec B Size)
// 2 chars: 'XX' (Padding/Reserved to fill 10 chars? No, Sec B Size is 0, so 0 chars read. Remaining is padding.)
// Wait:
// > (1)
// 1 (1)
// 02 (2) -> Sec A Header
// PA (2) -> Sec A Data (P=PaxDesc, A=CheckInSrc)
// 00 (2) -> Sec B Header
// Total used: 1+1+2+2+2 = 8 chars.
// Remaining 2 chars: 'XX' (Padding).
// Total 10 chars. Matches '0A'.
const CONDITIONAL_STRING =
"M1DOE/TEST            E" +
"1234567" + "LHR" + "JFK" + "BA " + "00123" + "107" + "Y" + "012A" + "00001" + "1" + "0A" +
">102PA00XX";

describe('BCBP Parser', () => {
  it('parses a standard single leg boarding pass', () => {
    const result = parseBCBP(VALID_V7_STRING_FIXED);
    expect(result.success).toBe(true);
    expect(result.data?.passengerName).toBe('DOE/JOHN');
    expect(result.data?.legs[0].departureAirport).toBe('LHR');

    // Check Segments
    expect(result.segments).toBeDefined();
    expect(result.segments?.length).toBeGreaterThan(10);
    const pnrSeg = result.segments?.find(s => s.label === 'PNR Code');
    expect(pnrSeg).toBeDefined();
    expect(pnrSeg?.value).toBe('1234567');
    expect(pnrSeg?.start).toBeGreaterThan(20);
  });

  it('parses multi-leg boarding pass', () => {
    const result = parseBCBP(MULTI_LEG_STRING);
    expect(result.success).toBe(true);
    expect(result.data?.legs).toHaveLength(2);
    expect(result.segments?.filter(s => s.section === 'leg_mandatory')).toHaveLength(2 * 11); // Approx 11 fields per leg
  });

  it('parses conditional data (Section A & B structures)', () => {
    const result = parseBCBP(CONDITIONAL_STRING);

    if (!result.success) {
        console.error("Conditional Parse Error:", result.error);
    }
    expect(result.success).toBe(true);

    // Check Segment Extraction
    const verSeg = result.segments?.find(s => s.label === 'Version Number');
    expect(verSeg).toBeDefined();
    expect(verSeg?.value).toBe('1');

    const descSeg = result.segments?.find(s => s.label === 'Passenger Description');
    expect(descSeg?.value).toBe('P');

    const srcSeg = result.segments?.find(s => s.label === 'Check-in Source');
    expect(srcSeg?.value).toBe('A');

    // Validate Data Object
    expect(result.data?.version).toBe(1);
    expect(result.data?.passengerDescription).toBe('P');
    expect(result.data?.checkInSource).toBe('A');
  });

  it('fails soft on invalid data', () => {
    const BAD_STRING = "M1";
    const result = parseBCBP(BAD_STRING);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Input too short');
  });
});
