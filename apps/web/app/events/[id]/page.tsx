import { fetchEventById } from '@/lib/api';
import { EventDetail, ApiResponse } from '@/lib/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RealTimePriceUpdate from '@/components/RealTimePriceUpdate';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  let event: EventDetail | null = null;
  let error: string | null = null;

  try {
    const response: ApiResponse<EventDetail> = await fetchEventById(id);
    if (response.success && response.data) {
      event = response.data;
    } else {
      error = response.error || 'Failed to load event';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load event';
  }

  if (!event) {
    notFound();
  }

  const eventDate = new Date(event.date);
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

  const availabilityPercentage = (event.availableTickets / event.totalTickets) * 100;
  const availabilityColor = 
    availabilityPercentage > 50 ? 'bg-green-500' :
    availabilityPercentage > 20 ? 'bg-yellow-500' :
    'bg-red-500';

  const isPastEvent = eventDate < new Date();

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

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/events" className="hover:text-slate-200 transition-colors">
            Events
          </Link>
          <span>/</span>
          <span className="text-slate-200">{event.name}</span>
        </nav>

        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-medium text-red-400 mb-2">Error Loading Event</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Event Header */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-4xl font-light text-slate-100 mb-4">
                  {event.name}
                </h1>
                {!event.isActive && (
                  <span className="inline-block px-3 py-1 text-sm font-medium text-red-400 bg-red-900/30 border border-red-700/50 rounded-full mb-4">
                    Inactive Event
                  </span>
                )}
                {isPastEvent && (
                  <span className="inline-block px-3 py-1 text-sm font-medium text-slate-400 bg-slate-700/30 border border-slate-600/50 rounded-full mb-4 ml-2">
                    Past Event
                  </span>
                )}
              </div>
            </div>

            <p className="text-lg text-slate-300 leading-relaxed mb-8">
              {event.description}
            </p>

            {/* Event Details Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-slate-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Date & Time</p>
                  <p className="text-slate-100 font-medium">{formattedDate}</p>
                  <p className="text-slate-300">{formattedTime}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-slate-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Venue</p>
                  <p className="text-slate-100 font-medium">{event.venue}</p>
                </div>
              </div>
            </div>

            {/* Availability Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Ticket Availability</span>
                <span className="text-sm font-medium text-slate-200">
                  {event.availableTickets} / {event.totalTickets} remaining
                </span>
              </div>
              <div className="w-full bg-slate-700/30 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full ${availabilityColor} transition-all duration-300`}
                  style={{ width: `${availabilityPercentage}%` }}
                />
              </div>
            </div>

            {/* Pricing Information */}
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700/30">
              <h2 className="text-xl font-medium text-slate-100 mb-4">Pricing Information</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Current Price</p>
                  <RealTimePriceUpdate eventId={event.id} initialPrice={event.currentPrice} />
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Base Price</p>
                  <p className="text-2xl font-semibold text-slate-300">
                    ${parseFloat(event.basePrice).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Price Range</p>
                  <p className="text-lg font-medium text-slate-300">
                    ${parseFloat(event.priceFloor).toFixed(2)} - ${parseFloat(event.priceCeiling).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-3">Price Breakdown</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                    <span className="text-slate-300">Base Price</span>
                    <span className="font-medium text-slate-200">${parseFloat(event.basePrice).toFixed(2)}</span>
                  </div>
                  
                  {event.pricingRules && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">Time-based Adjustment</span>
                          <span className="text-xs text-slate-500">({(event.pricingRules.timeBasedWeight * 100).toFixed(0)}% weight)</span>
                        </div>
                        <span className="text-orange-400 font-medium">
                          Varies by date proximity
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">Demand-based Adjustment</span>
                          <span className="text-xs text-slate-500">({(event.pricingRules.demandBasedWeight * 100).toFixed(0)}% weight)</span>
                        </div>
                        <span className="text-purple-400 font-medium">
                          Based on booking velocity
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">Inventory-based Adjustment</span>
                          <span className="text-xs text-slate-500">({(event.pricingRules.inventoryBasedWeight * 100).toFixed(0)}% weight)</span>
                        </div>
                        <span className="text-red-400 font-medium">
                          {((1 - event.availableTickets / event.totalTickets) * 100).toFixed(0)}% sold
                        </span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between items-center pt-3">
                    <span className="text-base font-medium text-slate-100">Current Price</span>
                    <span className="text-xl font-bold text-blue-400">${parseFloat(event.currentPrice).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {event.pricingRules && (
                <div>
                  <p className="text-sm text-slate-400 mb-3">Pricing Factor Weights</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-slate-800/50 rounded p-3">
                      <p className="text-slate-400 mb-1">Time-based</p>
                      <p className="text-slate-200 font-medium">
                        {(event.pricingRules.timeBasedWeight * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded p-3">
                      <p className="text-slate-400 mb-1">Demand-based</p>
                      <p className="text-slate-200 font-medium">
                        {(event.pricingRules.demandBasedWeight * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded p-3">
                      <p className="text-slate-400 mb-1">Inventory-based</p>
                      <p className="text-slate-200 font-medium">
                        {(event.pricingRules.inventoryBasedWeight * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-sm text-blue-300">
                <p>💡 Prices update dynamically every 30 seconds based on demand, time until event, and remaining tickets.</p>
              </div>
            </div>

            {/* Book Button */}
            <div className="mt-8 flex gap-4">
              {event.availableTickets > 0 && !isPastEvent && event.isActive ? (
                <Link
                  href={`/book?eventId=${event.id}`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-lg transition-colors text-center text-lg"
                >
                  Book Tickets
                </Link>
              ) : (
                <button
                  disabled
                  className="flex-1 bg-slate-700/50 text-slate-400 font-medium px-8 py-4 rounded-lg cursor-not-allowed text-center text-lg"
                >
                  {isPastEvent ? 'Event Has Passed' : 'Sold Out'}
                </button>
              )}
              <Link
                href="/events"
                className="px-6 py-4 border border-slate-600 hover:bg-slate-800/60 text-slate-200 font-medium rounded-lg transition-colors"
              >
                Back to Events
              </Link>
            </div>

            {/* Analytics Link */}
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/analytics/events/${event.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm group"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>View Event Analytics</span>
                <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 text-sm text-slate-500">
          <p>Event ID: {event.id}</p>
          <p>Created: {new Date(event.createdAt).toLocaleString()}</p>
          <p>Last Updated: {new Date(event.updatedAt).toLocaleString()}</p>
        </div>
      </main>
    </div>
  );
}
