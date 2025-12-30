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
      setError(
        "Could not parse boarding pass data. Please ensure you're scanning a valid boarding pass barcode in the standard IATA BCBP format (typically encoded as PDF417 or Aztec) and that the barcode is clearly visible."
      );
      setParsedData(null);
    }
  }, [rawScan]);

  const handleError = useCallback((errorMessage: string) => {
    // Most scanner errors are just "no barcode found" during scanning
    // We don't need to display these to users as they're expected
    console.debug('Scanner error:', errorMessage);
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Boarding Pass Scanner</h1>
        <p className="text-gray-400">
          Scan a boarding pass barcode (PDF417 or Aztec) to decode its contents instantly.
          Everything happens offline in your browser.
        </p>
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
             <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-700 rounded-xl text-gray-500">
               <p className="text-lg">Waiting for scan...</p>
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
