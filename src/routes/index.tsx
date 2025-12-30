import { createFileRoute, Link } from '@tanstack/react-router'
import { ScanBarcode } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white">
          Browser-Based <span className="text-brand-accent">Tools</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Private, secure, and instant. All tools run locally in your browser without sending data to the cloud.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ToolCard
          to="/tools/boarding-pass"
          title="Boarding Pass Scanner"
          description="Decode PDF417 and Aztec barcodes from boarding passes. Visualize raw data segments and extract flight details."
          icon={<ScanBarcode className="w-8 h-8 text-brand-green" />}
        />

        {/* Placeholder for future tools */}
        <div className="group block p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
           <div className="mb-4 opacity-30">
             <div className="w-12 h-12 bg-gray-700 rounded-lg animate-pulse"></div>
           </div>
           <h3 className="text-xl font-bold text-gray-600 mb-2">More coming soon...</h3>
        </div>
      </div>
    </div>
  )
}

function ToolCard({ to, title, description, icon }: { to: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group block p-6 bg-gray-900 border border-gray-700 rounded-xl transition-all hover:border-brand-accent hover:shadow-lg hover:shadow-brand-accent/10"
    >
      <div className="mb-4 p-3 bg-gray-800 rounded-lg w-fit group-hover:bg-brand-dark transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-accent transition-colors">{title}</h3>
      <p className="text-gray-400 leading-relaxed">
        {description}
      </p>
    </Link>
  )
}
