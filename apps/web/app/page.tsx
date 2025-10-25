import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-light tracking-tight text-slate-100">
              Ticketing System
            </h1>
            <nav className="flex gap-6">
              <Link href="/events" className="text-slate-300 hover:text-slate-100 transition-colors font-medium">
                Browse Events
              </Link>
              <Link href="/my-bookings" className="text-slate-400 hover:text-slate-100 transition-colors">
                My Bookings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-16">
        <div className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-light text-slate-100 tracking-tight">
              Dynamic Event Pricing
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
              A sophisticated platform for managing events with intelligent
              pricing algorithms and real-time availability tracking.
            </p>
          </div>

          <div className="grid gap-6 mt-12">
            <Link href="/events" className="group bg-slate-800/40 border border-slate-700/50 rounded-lg p-8 hover:bg-slate-800/60 transition-all duration-300">
              <h3 className="text-xl font-light text-slate-200 mb-3">
                Database Architecture
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Design and implement a robust schema for events, pricing tiers,
                and booking management.
              </p>
            </Link>

            <Link href="/events" className="group bg-slate-800/40 border border-slate-700/50 rounded-lg p-8 hover:bg-slate-800/60 transition-all duration-300">
              <h3 className="text-xl font-light text-slate-200 mb-3">
                API Infrastructure
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Configure secure endpoints for event creation, pricing
                calculations, and transaction handling.
              </p>
            </Link>

            <Link href="/events" className="group bg-slate-800/40 border border-slate-700/50 rounded-lg p-8 hover:bg-slate-800/60 transition-all duration-300">
              <h3 className="text-xl font-light text-slate-200 mb-3">
                Event Interface
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Build an elegant listing experience with filtering, search, and
                detailed event views.
              </p>
            </Link>

            <Link href="/events" className="group bg-slate-800/40 border border-slate-700/50 rounded-lg p-8 hover:bg-slate-800/60 transition-all duration-300">
              <h3 className="text-xl font-light text-slate-200 mb-3">
                Booking Flow
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Create a seamless reservation process with dynamic pricing and
                instant confirmation.
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
