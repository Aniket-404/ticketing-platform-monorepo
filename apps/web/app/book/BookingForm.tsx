'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Event } from '@/lib/types';

interface BookingFormProps {
  event: Event;
}

export default function BookingForm({ event }: BookingFormProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState(event.currentPrice);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${API_BASE_URL}/api/events/${event.id}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.currentPrice) {
            setCurrentPrice(data.data.currentPrice);
          }
        }
      } catch (error) {
        console.error('Error fetching price update:', error);
      }
    };

    // Poll every 30 seconds
    const interval = setInterval(fetchPrice, 30000);

    return () => clearInterval(interval);
  }, [event.id]);

  const totalAmount = (parseFloat(currentPrice) * quantity).toFixed(2);
  const maxQuantity = Math.min(event.availableTickets, 10); // Max 10 tickets per booking

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          userEmail: email,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create booking');
      }

      // Store booking ID and redirect to confirmation
      router.push(`/confirmation?bookingId=${data.data.bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-sm text-slate-400">We&apos;ll send your booking confirmation here</p>
      </div>

      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-slate-200 mb-2">
          Number of Tickets *
        </label>
        <select
          id="quantity"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          required
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              {num} {num === 1 ? 'ticket' : 'tickets'}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-slate-400">
          {event.availableTickets} tickets available
        </p>
      </div>

      <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700/30">
        <h3 className="text-lg font-medium text-slate-100 mb-4">Order Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-300">Price per ticket:</span>
            <span className="text-slate-100 font-medium">${parseFloat(currentPrice).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Quantity:</span>
            <span className="text-slate-100 font-medium">{quantity}</span>
          </div>
          <div className="border-t border-slate-700/50 pt-3 flex justify-between">
            <span className="text-lg font-medium text-slate-100">Total Amount:</span>
            <span className="text-2xl font-bold text-blue-400">${totalAmount}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Price updates every 30 seconds</span>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading || event.availableTickets === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium px-8 py-4 rounded-lg transition-colors text-lg"
        >
          {loading ? 'Processing...' : 'Confirm Booking'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-4 border border-slate-600 hover:bg-slate-800/60 text-slate-200 font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>

      <p className="text-sm text-slate-400 text-center">
        By completing this booking, you agree to our terms and conditions.
      </p>
    </form>
  );
}
