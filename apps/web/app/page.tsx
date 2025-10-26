import Link from 'next/link';
import { fetchEvents } from '@/lib/api';
import { Event, ApiResponse } from '@/lib/types';

export default async function Home() {
  let featuredEvents: Event[] = [];
  let hasError = false;

  try {
    const response: ApiResponse<Event[]> = await fetchEvents();
    if (response.success && response.data) {
      // Get first 3 events as featured
      featuredEvents = response.data.slice(0, 3);
    }
  } catch (err) {
    hasError = true;
    console.error('Failed to load events:', err);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-light tracking-tight text-slate-100">
              🎫 EventHub
            </Link>
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE2YzAgMy4zMTQtMi42ODYgNi02IDZMMC42IDI3LjRjLTMuMzE0IDAtNi0yLjY4Ni02LTZWMGgzNnYxNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold text-slate-100 tracking-tight">
              Discover Amazing
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Events Near You
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Book tickets for concerts, conferences, and exclusive events with intelligent dynamic pricing
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Link 
                href="/events" 
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Explore All Events
              </Link>
              <Link 
                href="/my-bookings" 
                className="px-8 py-4 bg-slate-800/60 border border-slate-600 text-slate-200 font-semibold rounded-lg hover:bg-slate-700/60 transition-all duration-300"
              >
                View My Bookings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      {!hasError && featuredEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">
                Featured Events
              </h2>
              <p className="text-slate-400">
                Don&apos;t miss out on these popular upcoming events
              </p>
            </div>
            <Link 
              href="/events" 
              className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 transition-colors"
            >
              View All
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <FeaturedEventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

function FeaturedEventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.date);

  const availabilityPercentage = (event.availableTickets / event.totalTickets) * 100;
  const isLowAvailability = availabilityPercentage < 20;

  return (
    <Link 
      href={`/events/${event.id}`}
      className="group relative bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden hover:bg-slate-800/60 hover:border-slate-600/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
    >
      {isLowAvailability && (
        <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
          Almost Sold Out!
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex flex-col items-center justify-center text-white">
            <span className="text-2xl font-bold">{eventDate.getDate()}</span>
            <span className="text-xs uppercase">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-slate-100 mb-2 group-hover:text-white transition-colors line-clamp-2">
              {event.name}
            </h3>
            <p className="text-sm text-slate-400 line-clamp-2">
              {event.description}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span>{event.availableTickets} tickets available</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <div>
            <p className="text-xs text-slate-400 mb-1">From</p>
            <p className="text-2xl font-bold text-slate-100">
              ${parseFloat(event.currentPrice).toFixed(2)}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg font-medium group-hover:bg-blue-500/20 transition-colors">
            Book Now
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
