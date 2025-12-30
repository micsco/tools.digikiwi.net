import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BcbpViewer from './BcbpViewer';
import { ParsedBcbp } from '../lib/bcbp';
import React from 'react';

// Mock data
const mockParsedData: ParsedBcbp = {
  raw: 'M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y12A  00001100',
  segments: [
    { id: 'formatCode', label: 'Format', rawValue: 'M', startIndex: 0, endIndex: 1, description: 'Format Code (M)' },
    { id: 'passengerName', label: 'Name', rawValue: 'DOE/JOHN', startIndex: 2, endIndex: 22, description: 'Passenger Name' },
  ],
  data: {
    passengerName: 'DOE/JOHN',
    pnr: 'ABCDEF',
    fromCity: 'LHR',
    toCity: 'JFK',
    carrier: 'BA',
    flightNumber: '00123',
    julianDate: '100',
    seat: '12A',
    checkInSeq: '00001',
    passengerStatus: '1',
  }
};

describe('BcbpViewer', () => {
  it('renders passenger name and decoded details', () => {
    render(<BcbpViewer parsed={mockParsedData} />);

    // There are multiple "DOE/JOHN" (one in raw data, one in decoded card)
    expect(screen.getAllByText('DOE/JOHN').length).toBeGreaterThan(0);
    expect(screen.getByText('LHR ➝ JFK')).toBeDefined();
    expect(screen.getByText('BA00123')).toBeDefined();
  });

  it('renders raw data structure', () => {
    render(<BcbpViewer parsed={mockParsedData} />);
    expect(screen.getByText('Raw Data Structure')).toBeDefined();
  });
});
