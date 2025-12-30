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
    // M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y012A00001100
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

    const raw = 'M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y012A00001100';
    const result = parseBcbp(raw);

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.data.passengerName).toBe('DOE/JOHN');
    expect(result.formatted.passengerName).toBe('John Doe');

    expect(result.data.pnr).toBe('ABCDEF');
    expect(result.data.fromCity).toBe('LHR');

    // Check Full Name Lookup
    expect(result.formatted.fromAirportFull).toContain('Heathrow');
    expect(result.formatted.toAirportFull).toContain('John F. Kennedy');
    expect(result.formatted.airlineFull).toBe('British Airways');

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
    const m = 'M1DOE/JANE            EABCDEF LHRJFKBA 00123100Y012A000011';

    // Size: 0A (10 chars in hex) -> "0A"
    const size = '0A';

    // Conditional: 1111100511 (Length 10)
    // 4-8: 1005 (Julian 100, Year 5) -> Date of Issue
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
  });

  it('should parse standard conditional block structure with >', () => {
     // Mandatory + Size + Start(>) + Ver(1) + Data
     const m = 'M1DOE/JANE            EABCDEF LHRJFKBA 00123100Y012A000011';
     // Length: 05 (5 bytes)
     const size = '05';
     // > (1) + 2 (Version) + ABC (Airline Data)
     const cond = '>2ABC';

     const raw = m + size + cond;
     const result = parseBcbp(raw);

     expect(result).not.toBeNull();
     if (!result) return;

     const startSeg = result.segments.find(s => s.id === 'startConditional');
     expect(startSeg).toBeDefined();
     expect(startSeg?.rawValue).toBe('>');

     const verSeg = result.segments.find(s => s.id === 'version');
     expect(verSeg?.rawValue).toBe('2');

     const contentSeg = result.segments.find(s => s.id === 'conditionalContent');
     expect(contentSeg?.rawValue).toBe('ABC');
  });
});
