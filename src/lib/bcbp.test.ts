import { describe, it, expect } from 'vitest';
import { parseBcbp } from './bcbp';

describe('BCBP Parser', () => {
  it('should return null for empty string', () => {
    expect(parseBcbp('')).toBeNull();
  });

  it('should return null for short string', () => {
    expect(parseBcbp('SHORT')).toBeNull();
  });

  it('should parse a standard BCBP string', () => {
    // M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y12A  00001100
    // + 1004 (Conditional length 04? No length is hex 04 -> 4 chars)
    // Let's create a valid string with conditional block
    // Mandatory: 60 chars
    // Var Size: 08 (8 chars)
    // Cond Data: 12345678

    // Mandatory Block Construction:
    // Format: M (1)
    // Legs: 1 (1)
    // Name: DOE/JOHN            (20)
    // E-Ticket: E (1)
    // PNR: ABCDEF  (7) - Padded with space if needed, PNR is 7 chars.
    // From: LHR (3)
    // To: JFK (3)
    // Carrier: BA  (3)
    // Flight: 00123 (5)
    // Date: 100 (3)
    // Class: Y (1)
    // Seat: 012A (4)
    // Seq: 00001 (5)
    // Status: 1 (1)

    // Total: 1+1+20+1+7+3+3+3+5+3+1+4+5+1 = 58 chars for Mandatory Block WITHOUT size.
    // Wait, the BCBP_SCHEMA defines offsets. Let's re-verify the offsets in `bcbp.ts`.

    // BCBP_SCHEMA items:
    // Format(1), Legs(1), Name(20), E(1), PNR(7), From(3), To(3), Carrier(3), Flight(5), Date(3), Class(1), Seat(4), Seq(5), Status(1).
    // Sum = 1+1+20+1+7+3+3+3+5+3+1+4+5+1 = 58 characters.
    // THEN comes the "Size" field (variable size field length) (2 chars).
    // Total min length expected by parser check = 60.

    // String Construction:
    // M (1)
    // 1 (1)
    // DOE/JOHN            (20)
    // E (1)
    // ABCDEF  (7) - Padded PNR
    // LHR (3)
    // JFK (3)
    // BA  (3) - Padded Carrier
    // 00123 (5)
    // 100 (3)
    // Y (1)
    // 012A (4)
    // 00001 (5)
    // 1 (1)
    // 00 (2) - Size field

    // M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y012A00001100
    // Index check:
    // M: 0
    // 1: 1
    // Name: 2-22
    // E: 22
    // PNR: 23-30
    // From: 30-33
    // To: 33-36
    // Carrier: 36-39
    // Flight: 39-44
    // Date: 44-47
    // Class: 47 -> Y.

    const raw = 'M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y012A00001100';
    const result = parseBcbp(raw);

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.data.passengerName).toBe('DOE/JOHN');
    expect(result.formatted.passengerName).toBe('John Doe');

    expect(result.data.pnr).toBe('ABCDEF');
    expect(result.data.fromCity).toBe('LHR');

    expect(result.data.flightNumber).toBe('00123');
    expect(result.formatted.flight).toBe('BA 123');

    expect(result.data.seat).toBe('012A');
    expect(result.formatted.seat).toBe('12A');

    expect(result.formatted.date).toContain('Apr'); // Day 100 is in April (non-leap)

    // Check Class Formatting (Y -> Economy)
    expect(result.formatted.classOfService).toContain('Economy Class');

    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.segments[0].id).toBe('formatCode');
  });

  it('should parse conditional block with date of issue', () => {
    // Mandatory (58 chars) + Size (2 chars) + Conditional Data

    // M1DOE/JANE            EABCDEF LHRJFKBA 00123100Y012A 000011
    // Length: 1+1+20+1+7+3+3+3+5+3+1+4+5+1 = 58

    const m = 'M1DOE/JANE            EABCDEF LHRJFKBA 00123100Y012A000011';

    // Size: 0A (10 chars in hex) -> "0A"
    const size = '0A';

    // Conditional: 1111100511 (Length 10)
    // Indexes relative to Conditional Block Start:
    // 0: 1
    // 1: 1
    // 2: 1
    // 3: 1
    // 4-8: 1005 (Julian 100, Year 5) -> Date of Issue
    // 8: 1
    // 9: 1
    const cond = '1111100511';

    const raw = m + size + cond;

    const result = parseBcbp(raw);
    expect(result).not.toBeNull();
    if (!result) return;

    // Check if conditional segment exists
    const condSeg = result.segments.find(s => s.id === 'conditionalData');
    expect(condSeg).toBeDefined();
    expect(condSeg?.rawValue).toBe(cond);

    // Check if dateOfIssue was extracted
    expect(result.data.dateOfIssue).toBe('1005');

    // Check formatted date uses the year 5 (2025)
    // Day 100 in 2025 is April 10th
    expect(result.formatted.date).toBe('Apr 10');
  });
});
