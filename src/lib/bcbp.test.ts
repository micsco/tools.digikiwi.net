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
    // Example BCBP string (Constructed to match length requirements)
    // M (Format)
    // 1 (Legs)
    // DOE/JOHN            (Name - 20 chars)
    // E (E-Ticket)
    // ABCDEF  (PNR - 7 chars)
    // LHR (From)
    // JFK (To)
    // BA  (Carrier)
    // 00123 (Flight)
    // 100 (Date)
    // Y (Class)
    // 12A  (Seat - 4 chars) - "12A "
    // 00001 (Seq - 5 chars)
    // 1 (Status)
    // 00 (Size)

    // Let's construct a valid length string based on the parser logic:
    // 1+1+20+1+7+3+3+3+5+3+1+4+5+1+2 = 60 chars exactly for the mandatory block + size

    const raw = 'M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y12A 00001100';
    const result = parseBcbp(raw);

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.data.passengerName).toBe('DOE/JOHN');
    expect(result.data.pnr).toBe('ABCDEF');
    expect(result.data.fromCity).toBe('LHR');
    expect(result.data.toCity).toBe('JFK');
    expect(result.data.carrier).toBe('BA');
    expect(result.data.flightNumber).toBe('00123');
    expect(result.data.julianDate).toBe('100');
    expect(result.data.seat).toBe('12A');
    expect(result.data.checkInSeq).toBe('00001');
    expect(result.data.passengerStatus).toBe('1');

    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.segments[0].id).toBe('formatCode');
    expect(result.segments[2].id).toBe('passengerName');
  });
});
