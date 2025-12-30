import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import BcbpViewer from './BcbpViewer';
import { ParsedBcbp } from '../lib/bcbp';

describe('BcbpViewer Component', () => {
  const mockParsedData: ParsedBcbp = {
    raw: 'M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y12A 00001100',
    segments: [
      {
        id: 'formatCode',
        label: 'Format',
        rawValue: 'M',
        startIndex: 0,
        endIndex: 1,
        description: 'Format Code (M)',
      },
      {
        id: 'legs',
        label: 'Legs',
        rawValue: '1',
        startIndex: 1,
        endIndex: 2,
        description: 'Number of Legs',
      },
      {
        id: 'passengerName',
        label: 'Name',
        rawValue: 'DOE/JOHN            ',
        startIndex: 2,
        endIndex: 22,
        description: 'Passenger Name',
      },
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
    },
  };

  it('should render without crashing', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    expect(container).toBeTruthy();
  });

  it('should render the raw data structure section', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    expect(container.textContent).toContain('Raw Data Structure');
  });

  it('should render the decoded information section', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    expect(container.textContent).toContain('Decoded Information');
  });

  it('should render passenger name', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    expect(container.textContent).toContain('DOE/JOHN');
  });

  it('should render PNR', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    expect(container.textContent).toContain('ABCDEF');
  });

  it('should render flight information', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    expect(container.textContent).toContain('BA00123');
  });

  it('should render route', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    expect(container.textContent).toContain('LHR ➝ JFK');
  });

  it('should render seat', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    expect(container.textContent).toContain('12A');
  });

  it('should render julian date', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    expect(container.textContent).toContain('100');
  });

  it('should render how it works section', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    expect(container.textContent).toContain('How it works');
    expect(container.textContent).toContain('IATA BCBP');
  });

  it('should not render detail cards for empty values', () => {
    const emptyData: ParsedBcbp = {
      ...mockParsedData,
      data: {
        passengerName: '',
        pnr: '',
        fromCity: '',
        toCity: '',
        carrier: '',
        flightNumber: '',
        julianDate: '',
        seat: '',
        checkInSeq: '',
        passengerStatus: '',
      },
    };
    
    const { container } = render(<BcbpViewer parsed={emptyData} />);
    
    // Should still render the main sections
    expect(container.textContent).toContain('Raw Data Structure');
    expect(container.textContent).toContain('Decoded Information');
    
    // Check that passenger icon (👤) is not rendered since no passenger name
    expect(container.textContent?.includes('👤')).toBe(false);
  });

  it('should make segments keyboard accessible with tabIndex', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    // Find elements with tabIndex
    const focusableSegments = container.querySelectorAll('[tabindex="0"]');
    expect(focusableSegments.length).toBeGreaterThan(0);
  });

  it('should include aria-label for accessibility', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    // Check that aria-labels are present on segments
    const elementsWithAriaLabel = container.querySelectorAll('[aria-label]');
    expect(elementsWithAriaLabel.length).toBeGreaterThan(0);
    
    // Check that first segment has proper aria-label
    const firstSegment = mockParsedData.segments[0];
    const expectedAriaLabel = `${firstSegment.label}: ${firstSegment.description}`;
    const matchingElement = Array.from(elementsWithAriaLabel).find(
      (el) => el.getAttribute('aria-label') === expectedAriaLabel
    );
    expect(matchingElement).toBeTruthy();
  });

  it('should render tooltips on focus for keyboard users', () => {
    const { container } = render(<BcbpViewer parsed={mockParsedData} />);
    
    // Check that tooltips have group-focus:opacity-100 class
    const tooltips = container.querySelectorAll('.group-focus\\:opacity-100');
    expect(tooltips.length).toBeGreaterThan(0);
  });
});
