'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UserBooking {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  userEmail: string;
  quantity: number;
  pricePaid: string;
  totalAmount: string;
  bookedAt: string;
  currentEventPrice?: string;
}

export default function MyBookingsClient() {
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(
        `${API_BASE_URL}/api/bookings?userEmail=${encodeURIComponent(email)}`,
        {
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const bookingsData = data.data;
        
        // Fetch current prices for all events
        const bookingsWithCurrentPrices = await Promise.all(
          bookingsData.map(async (booking: UserBooking) => {
            try {
              const eventResponse = await fetch(
                `${API_BASE_URL}/api/events/${booking.eventId}`,
                { cache: 'no-store' }
              );
              if (eventResponse.ok) {
                const eventData = await eventResponse.json();
                if (eventData.success && eventData.data) {
                  booking.currentEventPrice = eventData.data.currentPrice;
                }
              }
            } catch (error) {
              console.error(`Error fetching current price for event ${booking.eventId}:`, error);
            }
            return booking;
          })
        );
        
        setBookings(bookingsWithCurrentPrices);
      } else {
        setBookings([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

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

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-light text-slate-100 tracking-tight mb-3">
            My Bookings
          </h1>
          <p className="text-lg text-slate-400">
            View and manage your event bookings
          </p>
        </div>

        {/* Email Search Form */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="email" className="sr-only">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email to view bookings"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium px-8 py-3 rounded-lg transition-colors whitespace-nowrap"
            >
              {loading ? 'Searching...' : 'View Bookings'}
            </button>
          </form>
          <p className="mt-3 text-sm text-slate-400">
            Enter the email address you used when booking tickets
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-medium text-red-400 mb-2">Error Loading Bookings</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Bookings List */}
        {searched && !loading && (
          <>
            {bookings.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-12 text-center">
                <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-2xl font-light text-slate-300 mb-3">No Bookings Found</h3>
                <p className="text-slate-400 mb-6">
                  We couldn&apos;t find any bookings for this email address
                </p>
                <Link
                  href="/events"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Browse Events
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-light text-slate-200">
                    {bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'} Found
                  </h2>
                </div>

                {bookings.map((booking) => {
                  const eventDate = new Date(booking.eventDate);
                  const bookedDate = new Date(booking.bookedAt);
                  const isPastEvent = eventDate < new Date();

                  const formattedEventDate = eventDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });
                  const formattedEventTime = eventDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const formattedBookedDate = bookedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={booking.id}
                      className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden hover:bg-slate-800/60 transition-all duration-300"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-medium text-slate-100">
                                {booking.eventName}
                              </h3>
                              {isPastEvent && (
                                <span className="text-xs px-2 py-1 bg-slate-700/50 text-slate-400 rounded-full">
                                  Past Event
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400">
                              Booked on {formattedBookedDate}
                            </p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 mb-6">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Event Date</p>
                              <p className="text-sm text-slate-200 font-medium">{formattedEventDate}</p>
                              <p className="text-sm text-slate-300">{formattedEventTime}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Venue</p>
                              <p className="text-sm text-slate-200 font-medium">{booking.eventVenue}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Tickets</p>
                              <p className="text-sm text-slate-200 font-medium">{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 mb-1">Total Paid</p>
                            <p className="text-2xl font-semibold text-green-400">
                              ${parseFloat(booking.totalAmount).toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              ${parseFloat(booking.pricePaid).toFixed(2)} per ticket
                            </p>
                            
                            {/* Price Comparison */}
                            {booking.currentEventPrice && (
                              <div className="mt-3 p-2 bg-slate-900/50 rounded border border-slate-700/30">
                                <p className="text-xs text-slate-400 mb-1">Current Price: ${parseFloat(booking.currentEventPrice).toFixed(2)}</p>
                                {(() => {
                                  const priceDiff = parseFloat(booking.currentEventPrice) - parseFloat(booking.pricePaid);
                                  const isMoreExpensiveNow = priceDiff > 0;
                                  const totalDiff = priceDiff * booking.quantity;
                                  return (
                                    <p className={`text-xs font-medium ${isMoreExpensiveNow ? 'text-green-400' : 'text-red-400'}`}>
                                      {isMoreExpensiveNow ? (
                                        <>✓ You saved ${Math.abs(totalDiff).toFixed(2)} total!</>
                                      ) : (
                                        <>Price dropped ${Math.abs(totalDiff).toFixed(2)} since booking</>
                                      )}
                                    </p>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-3">
                            <Link
                              href={`/confirmation?bookingId=${booking.id}`}
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded transition-colors"
                            >
                              View Details
                            </Link>
                            <Link
                              href={`/events/${booking.eventId}`}
                              className="px-4 py-2 border border-slate-600 hover:bg-slate-800/60 text-slate-200 text-sm font-medium rounded transition-colors"
                            >
                              View Event
                            </Link>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-700/30">
                          <p className="text-xs text-slate-500">
                            Booking ID: {booking.id}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
