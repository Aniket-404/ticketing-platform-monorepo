import { fetchEvents } from '@/lib/api';
import { Event, ApiResponse } from '@/lib/types';
import Link from 'next/link';

export default async function EventsPage() {
  let events: Event[] = [];
  let error: string | null = null;

  try {
    const response: ApiResponse<Event[]> = await fetchEvents();
    if (response.success && response.data) {
      events = response.data;
    } else {
      error = response.error || 'Failed to load events';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load events';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-light tracking-tight text-slate-100 hover:text-slate-300 transition-colors">
              Ticketing System
            </Link>
            <nav className="flex gap-6">
              <Link href="/events" className="text-slate-300 hover:text-slate-100 transition-colors font-medium">
                Events
              </Link>
              <Link href="/my-bookings" className="text-slate-400 hover:text-slate-100 transition-colors">
                My Bookings
              </Link>
              <a 
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/analytics/summary`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-100 transition-colors inline-flex items-center gap-1"
              >
                Analytics
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-light text-slate-100 tracking-tight mb-3">
            Upcoming Events
          </h1>
          <p className="text-lg text-slate-400">
            Browse and book tickets for upcoming events with dynamic pricing
          </p>
        </div>

        {error ? (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
            <h3 className="text-xl font-medium text-red-400 mb-2">Error Loading Events</h3>
            <p className="text-red-300">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-12 text-center">
            <h3 className="text-2xl font-light text-slate-300 mb-3">No Events Available</h3>
            <p className="text-slate-400">Check back later for upcoming events</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const availabilityPercentage = (event.availableTickets / event.totalTickets) * 100;
  const availabilityColor = 
    availabilityPercentage > 50 ? 'text-green-400' :
    availabilityPercentage > 20 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <Link 
      href={`/events/${event.id}`}
      className="group bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden hover:bg-slate-800/60 hover:border-slate-600/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-900/50"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-medium text-slate-100 mb-2 group-hover:text-white transition-colors">
              {event.name}
            </h3>
            <p className="text-sm text-slate-400 line-clamp-2">
              {event.description}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-300">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">
              {formattedDate} at {formattedTime}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">{event.venue}</span>
          </div>

          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span className={`text-sm font-medium ${availabilityColor}`}>
              {event.availableTickets} / {event.totalTickets} available
            </span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Current Price</p>
              <p className="text-2xl font-semibold text-slate-100">
                ${parseFloat(event.currentPrice).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Base: ${parseFloat(event.basePrice).toFixed(2)}</p>
              <div className="text-xs text-slate-500 mt-1">
                Floor: ${parseFloat(event.priceFloor).toFixed(2)} | 
                Ceiling: ${parseFloat(event.priceCeiling).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <span className="inline-flex items-center gap-2 text-sm text-blue-400 group-hover:text-blue-300 transition-colors">
            View Details
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
