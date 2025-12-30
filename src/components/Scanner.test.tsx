import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import Scanner from './Scanner';
import React from 'react';

// Mock html5-qrcode
const mockRender = vi.fn();
const mockClear = vi.fn().mockResolvedValue(undefined);

vi.mock('html5-qrcode', () => {
  return {
    Html5QrcodeScanner: vi.fn().mockImplementation(() => {
      return {
        render: mockRender,
        clear: mockClear,
      };
    }),
  };
});

describe('Scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Create the element that Scanner expects
    const div = document.createElement('div');
    div.id = 'html5qr-code-full-region';
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders and initializes the scanner', () => {
    const onScan = vi.fn();
    render(<Scanner onScan={onScan} />);

    // Check if Html5QrcodeScanner was instantiated (via mock)
    // Note: Since we mocked the module, we can check if the constructor was called?
    // Or just check if render was called.
    expect(mockRender).toHaveBeenCalled();
  });

  // Note: Testing full cleanup is tricky with `useEffect` in simple unit tests without mounting/unmounting behavior fully simulated,
  // but checking initialization is a good start.
});
