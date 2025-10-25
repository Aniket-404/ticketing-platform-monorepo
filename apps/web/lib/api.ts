// API client functions for server components

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchEvents() {
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    cache: 'no-store', // Ensure fresh data
  });

  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

  return response.json();
}

export async function fetchEventById(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch event');
  }

  return response.json();
}

export async function fetchBookings(userEmail?: string) {
  const url = userEmail 
    ? `${API_BASE_URL}/api/bookings?userEmail=${encodeURIComponent(userEmail)}`
    : `${API_BASE_URL}/api/bookings`;
    
  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch bookings');
  }

  return response.json();
}

export async function createBooking(data: {
  eventId: string;
  userEmail: string;
  quantity: number;
}) {
  const response = await fetch(`${API_BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create booking');
  }

  return response.json();
}
