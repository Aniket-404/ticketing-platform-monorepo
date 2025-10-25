import { fetchEventById } from '@/lib/api';
import { EventDetail, ApiResponse } from '@/lib/types';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import BookingForm from './BookingForm';
import RealTimePriceUpdate from '@/components/RealTimePriceUpdate';

interface PageProps {
  searchParams: Promise<{
    eventId?: string;
  }>;
}

export default async function BookPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const eventId = params.eventId;

  if (!eventId) {
    redirect('/events');
  }

  let event: EventDetail | null = null;
  let error: string | null = null;

  try {
    const response: ApiResponse<EventDetail> = await fetchEventById(eventId);
    if (response.success && response.data) {
      event = response.data;
    } else {
      error = response.error || 'Failed to load event';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load event';
  }

  if (!event) {
    redirect('/events');
  }

  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date();

  // Redirect if event is not bookable
  if (isPastEvent || !event.isActive || event.availableTickets === 0) {
    redirect(`/events/${eventId}`);
  }

  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

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
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/events" className="hover:text-slate-200 transition-colors">
            Events
          </Link>
          <span>/</span>
          <Link href={`/events/${eventId}`} className="hover:text-slate-200 transition-colors">
            {event.name}
          </Link>
          <span>/</span>
          <span className="text-slate-200">Book Tickets</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-light text-slate-100 mb-2">
            Book Tickets
          </h1>
          <p className="text-lg text-slate-400">
            Complete your booking for {event.name}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-medium text-red-400 mb-2">Error Loading Event</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Event Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-medium text-slate-100 mb-4">Event Details</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Event</p>
                  <p className="text-slate-100 font-medium">{event.name}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">Date & Time</p>
                  <p className="text-slate-100">{formattedDate}</p>
                  <p className="text-slate-300 text-sm">{formattedTime}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">Venue</p>
                  <p className="text-slate-100">{event.venue}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-1">Availability</p>
                  <p className="text-slate-100">
                    {event.availableTickets} of {event.totalTickets} tickets
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-700/50">
                  <p className="text-sm text-slate-400 mb-2">Current Price</p>
                  <RealTimePriceUpdate eventId={event.id} initialPrice={event.currentPrice} />
                </div>
              </div>

              <div className="mt-6 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300">
                💡 Price is locked at time of booking
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-8">
              <h2 className="text-2xl font-medium text-slate-100 mb-6">Booking Information</h2>
              <BookingForm event={event} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
