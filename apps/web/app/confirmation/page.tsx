import Link from 'next/link';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{
    bookingId?: string;
  }>;
}

interface BookingDetails {
  id: string;
  eventId: string;
  eventName: string;
  eventDescription: string;
  eventDate: string;
  eventVenue: string;
  userEmail: string;
  quantity: number;
  pricePaid: string;
  totalAmount: string;
  bookedAt: string;
  currentEventPrice?: string;
}

async function fetchBookingById(id: string): Promise<BookingDetails | null> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${API_BASE_URL}/api/bookings/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) {
      const booking = data.data;
      
      // Fetch current event price
      try {
        const eventResponse = await fetch(`${API_BASE_URL}/api/events/${booking.eventId}`, {
          cache: 'no-store',
        });
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          if (eventData.success && eventData.data) {
            booking.currentEventPrice = eventData.data.currentPrice;
          }
        }
      } catch (error) {
        console.error('Error fetching current event price:', error);
      }
      
      return booking;
    }
    return null;
  } catch (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
}

export default async function ConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const bookingId = params.bookingId;

  if (!bookingId) {
    redirect('/events');
  }

  const booking = await fetchBookingById(bookingId);

  if (!booking) {
    redirect('/events');
  }

  const eventDate = new Date(booking.eventDate);
  const bookedDate = new Date(booking.bookedAt);
  
  const formattedEventDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedEventTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedBookedDate = bookedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
        {/* Success Message */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 border-2 border-green-500 rounded-full mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-light text-slate-100 mb-3">
            Booking Confirmed!
          </h1>
          <p className="text-lg text-slate-400">
            Your tickets have been successfully reserved
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50 px-8 py-6">
            <h2 className="text-2xl font-medium text-slate-100 mb-2">
              {booking.eventName}
            </h2>
            <p className="text-slate-300">{booking.eventDescription}</p>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Event Date & Time</p>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-slate-100 font-medium">{formattedEventDate}</p>
                      <p className="text-slate-300">{formattedEventTime}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-2">Venue</p>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-slate-100 font-medium">{booking.eventVenue}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Email Confirmation Sent To</p>
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-100 font-medium">{booking.userEmail}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-2">Booking Date</p>
                  <p className="text-slate-100 font-medium">{formattedBookedDate}</p>
                </div>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700/30">
              <h3 className="text-lg font-medium text-slate-100 mb-4">Booking Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Number of Tickets:</span>
                  <span className="text-slate-100 font-medium">{booking.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Price per Ticket:</span>
                  <span className="text-slate-100 font-medium">${parseFloat(booking.pricePaid).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-700/50 pt-3 flex justify-between">
                  <span className="text-lg font-medium text-slate-100">Total Amount Paid:</span>
                  <span className="text-2xl font-bold text-green-400">${parseFloat(booking.totalAmount).toFixed(2)}</span>
                </div>
                
                {/* Price Comparison */}
                {booking.currentEventPrice && (
                  <>
                    <div className="border-t border-slate-700/50 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Current Ticket Price:</span>
                        <span className="text-slate-100 font-medium">${parseFloat(booking.currentEventPrice).toFixed(2)}</span>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Price Difference:</span>
                        {(() => {
                          const priceDiff = parseFloat(booking.currentEventPrice) - parseFloat(booking.pricePaid);
                          const isMoreExpensiveNow = priceDiff > 0;
                          return (
                            <span className={`font-medium ${isMoreExpensiveNow ? 'text-green-400' : 'text-red-400'}`}>
                              {isMoreExpensiveNow ? (
                                <>You saved ${Math.abs(priceDiff).toFixed(2)} per ticket! 🎉</>
                              ) : (
                                <>Price dropped by ${Math.abs(priceDiff).toFixed(2)} per ticket</>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Booking ID */}
            <div className="mt-6 p-4 bg-slate-900/30 rounded border border-slate-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Booking Reference ID</p>
                  <p className="text-sm text-slate-100 font-mono">{booking.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/my-bookings"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-lg transition-colors text-center"
          >
            View All My Bookings
          </Link>
          <Link
            href="/events"
            className="flex-1 border border-slate-600 hover:bg-slate-800/60 text-slate-200 font-medium px-8 py-4 rounded-lg transition-colors text-center"
          >
            Browse More Events
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">What&apos;s Next?</p>
              <ul className="list-disc list-inside space-y-1 text-blue-200">
                <li>A confirmation email has been sent to {booking.userEmail}</li>
                <li>Save your booking reference ID: {booking.id}</li>
                <li>Arrive at the venue on time with your confirmation email</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
