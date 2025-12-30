import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import Scanner from '../../components/Scanner'
import BcbpViewer from '../../components/BcbpViewer'
import { parseBcbp, ParsedBcbp } from '../../lib/bcbp'

export const Route = createFileRoute('/tools/boarding-pass')({
  component: BoardingPassTool,
})

function BoardingPassTool() {
  const [parsedData, setParsedData] = useState<ParsedBcbp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawScan, setRawScan] = useState<string | null>(null);

  const handleScan = useCallback((decodedText: string) => {
    // Prevent infinite re-renders if same code is scanned repeatedly
    if (decodedText === rawScan) return;

    setRawScan(decodedText);
    const parsed = parseBcbp(decodedText);

    if (parsed) {
      setParsedData(parsed);
      setError(null);
    } else {
      setError("Could not read the boarding pass barcode. Please ensure the barcode is clearly visible and try scanning again.");
      setParsedData(null);
    }
  }, [rawScan]);

  const handleError = useCallback((errorMessage: string) => {
    // We might not want to show every scanning error as they can be frequent (e.g. "QR code not found")
    // But if it's a critical error or the user needs feedback, we can log it or show it.
    // For now, let's just log to console to avoid spamming the UI,
    // unless it's a permission error which html5-qrcode usually handles in its UI.
    console.debug("Scanner error:", errorMessage);
  }, []);

  const loadSample = () => {
    // Sample with full Mandatory block + Size + Conditional
    // M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y012A000011 (58 chars)
    // + Size (08) + XXXX1005 (8 chars)
    // This allows verification of Date of Issue extraction (1005 -> Day 100, Year 2025)
    const sample = 'M1DOE/JOHN            EABCDEF LHRJFKBA 00123100Y012A00001108XXXX1005';
    handleScan(sample);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
           <h1 className="text-3xl font-bold text-white mb-2">Boarding Pass Scanner</h1>
           <p className="text-gray-400">
             Scan a boarding pass barcode (PDF417 or Aztec) to decode its contents instantly.
           </p>
        </div>
        <button
          data-testid="load-sample-btn"
          onClick={loadSample}
          className="mt-4 md:mt-0 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded border border-gray-600 transition-colors"
        >
          Load Sample
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Scanner */}
        <div className="lg:col-span-1 space-y-6">
           <Scanner onScan={handleScan} onError={handleError} />

           <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl">
             <h3 className="font-semibold text-brand-accent mb-2">Barcode Types</h3>
             <ul className="space-y-3 text-sm text-gray-300">
               <li className="flex items-start">
                 <span className="mr-2 text-xl">🏁</span>
                 <span>
                   <strong>PDF417:</strong> A stacked linear barcode format used in most paper boarding passes.
                 </span>
               </li>
               <li className="flex items-start">
                 <span className="mr-2 text-xl">▣</span>
                 <span>
                   <strong>Aztec:</strong> A 2D matrix barcode (like a QR code) often used for mobile boarding passes.
                 </span>
               </li>
             </ul>
           </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2">
           {error && (
             <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl mb-6">
               {error}
             </div>
           )}

           {!parsedData && !error && (
             <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 text-center">
               <p className="text-4xl mb-4">📷</p>
               <p className="text-lg mb-2">Waiting for scan...</p>
               <p className="text-sm text-gray-600">Point your camera at a boarding pass or use the "Load Sample" button.</p>
             </div>
           )}

           {parsedData && (
             <BcbpViewer parsed={parsedData} />
           )}
        </div>
      </div>
    </div>
  )
}
