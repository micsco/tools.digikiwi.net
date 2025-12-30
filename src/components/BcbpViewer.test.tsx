import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BcbpViewer from './BcbpViewer';
import { ParsedBcbp, Segment } from '../lib/bcbp';
import React from 'react';

// Mock data
const mockLeg = {
    pnrCode: 'ABCDEF',
    departureAirport: 'LHR',
    arrivalAirport: 'JFK',
    operatingCarrier: 'BA',
    flightNumber: '123',
    dateOfFlight: 100,
    compartment: { code: 'Y', description: 'Economy' },
    seatNumber: '12A',
    sequenceNumber: '1',
    passengerStatus: { code: '1', description: 'Confirmed' },
    freeBaggageAllowance: '20K'
};

const mockParsedData: ParsedBcbp = {
  formatCode: 'M',
  numberOfLegs: 1,
  passengerName: 'DOE/JOHN',
  electronicTicket: 'E',
  legs: [mockLeg],
  baggageTags: ['0123456789'],
  version: 1,
  passengerDescription: 'Adult'
};

const mockSegments: Segment[] = [
    { label: 'Format Code', value: 'M', raw: 'M', start: 0, end: 1, section: 'header' },
    { label: 'Passenger Name', value: 'DOE/JOHN', raw: 'DOE/JOHN            ', start: 2, end: 22, section: 'header' },
];

describe('BcbpViewer', () => {
  it('renders passenger name and decoded details', () => {
    render(<BcbpViewer parsed={mockParsedData} segments={mockSegments} />);

    expect(screen.getAllByText('DOE/JOHN').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LHR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('JFK').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BA 123').length).toBeGreaterThan(0);
  });

  it('renders conditional data (baggage)', () => {
    render(<BcbpViewer parsed={mockParsedData} segments={mockSegments} />);
    expect(screen.getByText('Baggage Allowance')).toBeDefined();
    expect(screen.getByText('20K')).toBeDefined();
    expect(screen.getByText('Bag Tags')).toBeDefined();
    expect(screen.getByText('0123456789')).toBeDefined();
  });

  it('switches to Raw Data tab', () => {
    render(<BcbpViewer parsed={mockParsedData} segments={mockSegments} />);

    const rawTab = screen.getByText('Raw Data Inspector');
    fireEvent.click(rawTab);

    // Check if segments are rendered
    expect(screen.getByText('M')).toBeDefined();
    // Raw passenger name (with spaces) might be split or rendered as is.
    // Our Viewer renders {seg.raw}.
    expect(screen.getByText('DOE/JOHN')).toBeDefined();
  });
});
