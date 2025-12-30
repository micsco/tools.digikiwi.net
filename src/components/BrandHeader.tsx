import { Link } from '@tanstack/react-router'

export default function BrandHeader() {
  return (
    <header className="p-4 border-b border-gray-800 bg-brand-dark flex items-center justify-between">
      <Link to="/" className="text-2xl font-bold tracking-tighter">
        <span className="text-white">tools.</span>
        <span className="text-brand-accent">DIGIKIWI</span>
      </Link>
    </header>
  )
}
