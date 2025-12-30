import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
}

export default function Scanner({ onScan, onError }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // We only want to initialize this once
    if (scannerRef.current) return;

    // The element ID where the scanner will render
    const elementId = "html5qr-code-full-region";

    // Initialize only if element exists (it should)
    const element = document.getElementById(elementId);
    if (!element) return;

    const scanner = new Html5QrcodeScanner(
      elementId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      /* verbose= */ false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        // Optionally stop scanning after success? User might want to scan multiple.
        // For now, let's keep it running but maybe we can add a pause.
      },
      (errorMessage) => {
        // parse error, ignore it.
        if (onError) onError(errorMessage);
      }
    );

    setIsScanning(true);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
            console.error("Failed to clear html5-qrcode scanner. ", error);
        });
        scannerRef.current = null;
      }
    };
  }, [onScan, onError]);

  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 p-4 rounded-xl border border-gray-700">
      <div id="html5qr-code-full-region" className="rounded-lg overflow-hidden"></div>
      <p className="text-sm text-gray-400 mt-2 text-center">
        Point your camera at a boarding pass barcode.
      </p>
    </div>
  );
}
