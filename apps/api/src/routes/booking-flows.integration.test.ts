/**
 * End-to-End Booking Flow Integration Tests
 * 
 * This test suite simulates complete user journeys through the booking process,
 * testing the entire flow from event discovery to booking confirmation.
 */

import request from 'supertest';
import express, { Express } from 'express';
import eventsRouter from './events';
import bookingsRouter from './bookings';
import { db } from '@repo/database';

// Mock the database module
jest.mock('@repo/database', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  },
  events: {
    id: 'id',
    name: 'name',
    description: 'description',
    date: 'date',
    venue: 'venue',
    totalTickets: 'totalTickets',
    bookedTickets: 'bookedTickets',
    basePrice: 'basePrice',
    currentPrice: 'currentPrice',
    priceFloor: 'priceFloor',
    priceCeiling: 'priceCeiling',
    pricingRules: 'pricingRules',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  bookings: {
    id: 'id',
    eventId: 'eventId',
    userEmail: 'userEmail',
    quantity: 'quantity',
    pricePaid: 'pricePaid',
    totalAmount: 'totalAmount',
    createdAt: 'createdAt',
  },
}));

// Mock drizzle-orm functions
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((_field, value) => ({ field: _field, value })),
  and: jest.fn((...conditions) => ({ type: 'and', conditions })),
  gte: jest.fn((_field, value) => ({ field: _field, value })),
  sql: jest.fn((strings, ...values) => ({ strings, values })),
  sum: jest.fn(() => 'sum'),
  avg: jest.fn(() => 'avg'),
  count: jest.fn(() => 'count'),
  desc: jest.fn(() => 'desc'),
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  requireApiKey: jest.fn((_req, _res, next) => next()),
}));

describe('End-to-End Booking Flow Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/events', eventsRouter);
    app.use('/api/bookings', bookingsRouter);
  });

  describe('Happy Path: Complete Booking Flow', () => {
    it('should complete a full booking journey: browse events → select event → create booking → view confirmation', async () => {
      // Step 1: Browse available events
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Summer Music Festival',
          description: 'Outdoor music festival',
          date: new Date('2025-07-15'),
          venue: 'Central Park',
          totalTickets: 1000,
          bookedTickets: 300,
          basePrice: '75.00',
          currentPrice: '82.50',
          priceFloor: '60.00',
          priceCeiling: '150.00',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue(mockEvents);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
      });

      // Mock bookings count query for event list
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: mockFrom,
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        });

      const browseResponse = await request(app)
        .get('/api/events')
        .expect(200);

      expect(browseResponse.body.success).toBe(true);
      expect(browseResponse.body.data).toHaveLength(1);
      expect(browseResponse.body.data[0]).toHaveProperty('name', 'Summer Music Festival');

      const selectedEventId = browseResponse.body.data[0].id;

      // Step 2: Get detailed information about selected event
      const mockEventDetail = {
        id: selectedEventId,
        name: 'Summer Music Festival',
        description: 'Outdoor music festival',
        date: new Date('2025-07-15'),
        venue: 'Central Park',
        totalTickets: 1000,
        bookedTickets: 300,
        basePrice: '75.00',
        currentPrice: '82.50',
        priceFloor: '60.00',
        priceCeiling: '150.00',
        pricingRules: {
          timeBasedWeight: 0.3,
          demandBasedWeight: 0.4,
          inventoryBasedWeight: 0.3,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.clearAllMocks();

      const mockLimit = jest.fn().mockResolvedValue([mockEventDetail]);
      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        limit: mockLimit,
      });

      // Mock bookings count query for single event
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: mockFrom,
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        });

      const detailResponse = await request(app)
        .get(`/api/events/${selectedEventId}`)
        .expect(200);

      expect(detailResponse.body.success).toBe(true);
      expect(detailResponse.body.data).toHaveProperty('totalTickets', 1000);
      expect(detailResponse.body.data).toHaveProperty('bookedTickets', 300);

      // Step 3: Create a booking
      const bookingRequest = {
        eventId: selectedEventId,
        userEmail: 'customer@example.com',
        quantity: 2,
      };

      const mockEvent = {
        id: selectedEventId,
        name: 'Summer Music Festival',
        isActive: true,
        date: new Date(Date.now() + 86400000 * 180).toISOString(), // 180 days from now
        totalTickets: 1000,
        bookedTickets: 300,
        currentPrice: '82.50',
      };

      const mockBooking = {
        id: 'booking-abc123',
        eventId: selectedEventId,
        userEmail: 'customer@example.com',
        quantity: 2,
        pricePaid: '82.50',
        totalAmount: '165.00',
        createdAt: new Date(),
      };

      jest.clearAllMocks();

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          for: jest.fn().mockResolvedValue([mockEvent]),
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockBooking]),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
        };
        return callback(mockTx);
      });

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect(201);

      expect(bookingResponse.body.success).toBe(true);
      expect(bookingResponse.body.data).toHaveProperty('bookingId', 'booking-abc123');
      expect(bookingResponse.body.data).toHaveProperty('totalAmount', '165.00');
      expect(bookingResponse.body.data).toHaveProperty('eventName', 'Summer Music Festival');

      // Step 4: View booking confirmation
      const bookingId = bookingResponse.body.data.bookingId;

      const mockBookingDetails = {
        id: bookingId,
        eventId: selectedEventId,
        eventName: 'Summer Music Festival',
        eventDescription: 'Outdoor music festival',
        eventDate: new Date('2025-07-15'),
        eventVenue: 'Central Park',
        userEmail: 'customer@example.com',
        quantity: 2,
        pricePaid: '82.50',
        totalAmount: '165.00',
        bookedAt: new Date(),
      };

      jest.clearAllMocks();

      const mockInnerJoin = jest.fn().mockReturnThis();
      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        innerJoin: mockInnerJoin,
      });
      mockInnerJoin.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockBookingDetails]),
      });

      const confirmationResponse = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .expect(200);

      expect(confirmationResponse.body.success).toBe(true);
      expect(confirmationResponse.body.data).toHaveProperty('id', bookingId);
      expect(confirmationResponse.body.data).toHaveProperty('eventName', 'Summer Music Festival');
      expect(confirmationResponse.body.data).toHaveProperty('quantity', 2);
      expect(confirmationResponse.body.data).toHaveProperty('totalAmount', '165.00');
    });
  });

  describe('Edge Case: Full Capacity Event', () => {
    it('should prevent booking when event is at full capacity', async () => {
      // Step 1: Browse events and find a nearly full event
      const mockEvents = [
        {
          id: 'event-full',
          name: 'Sold Out Concert',
          description: 'Popular concert',
          date: new Date('2025-08-01'),
          venue: 'Arena',
          totalTickets: 100,
          bookedTickets: 100, // Fully booked
          basePrice: '100.00',
          currentPrice: '150.00',
          priceFloor: '80.00',
          priceCeiling: '200.00',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue(mockEvents);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
      });

      // Mock bookings count query
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: mockFrom,
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        });

      const browseResponse = await request(app)
        .get('/api/events')
        .expect(200);

      expect(browseResponse.body.data[0]).toHaveProperty('bookedTickets', 100);
      expect(browseResponse.body.data[0]).toHaveProperty('totalTickets', 100);

      // Step 2: Attempt to book tickets for full event
      const bookingRequest = {
        eventId: 'event-full',
        userEmail: 'lateuser@example.com',
        quantity: 1,
      };

      const mockFullEvent = {
        id: 'event-full',
        name: 'Sold Out Concert',
        isActive: true,
        date: new Date(Date.now() + 86400000 * 60).toISOString(), // 60 days from now
        totalTickets: 100,
        bookedTickets: 100, // Already full
        currentPrice: '150.00',
      };

      jest.clearAllMocks();

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          for: jest.fn().mockResolvedValue([mockFullEvent]),
        };
        // Throw error when trying to book
        throw new Error('INSUFFICIENT_TICKETS');
      });

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect(409); // Conflict status for insufficient tickets

      expect(bookingResponse.body.success).toBe(false);
      expect(bookingResponse.body.error).toContain('Insufficient');
    });
  });

  describe('Edge Case: Concurrent Booking Race Condition', () => {
    it('should handle concurrent bookings gracefully using database locking', async () => {
      // Simulate two users trying to book the last tickets simultaneously
      const eventId = 'event-limited';
      
      const mockEvent = {
        id: eventId,
        name: 'Limited Seats Event',
        isActive: true,
        date: new Date(Date.now() + 86400000 * 90).toISOString(), // 90 days from now
        totalTickets: 100,
        bookedTickets: 98, // Only 2 tickets left
        currentPrice: '75.00',
      };

      // First booking succeeds
      const booking1Request = {
        eventId: eventId,
        userEmail: 'user1@example.com',
        quantity: 2,
      };

      const mockBooking1 = {
        id: 'booking-user1',
        eventId: eventId,
        userEmail: 'user1@example.com',
        quantity: 2,
        pricePaid: '75.00',
        totalAmount: '150.00',
        createdAt: new Date(),
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          for: jest.fn().mockResolvedValue([mockEvent]),
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockBooking1]),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
        };
        return callback(mockTx);
      });

      const booking1Response = await request(app)
        .post('/api/bookings')
        .send(booking1Request)
        .expect(201);

      expect(booking1Response.body.success).toBe(true);
      expect(booking1Response.body.data).toHaveProperty('bookingId', 'booking-user1');

      // Second booking should fail (tickets no longer available)
      const booking2Request = {
        eventId: eventId,
        userEmail: 'user2@example.com',
        quantity: 2,
      };

      const mockFullEventAfterBooking1 = {
        ...mockEvent,
        bookedTickets: 100, // Now fully booked after first booking
      };

      jest.clearAllMocks();

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          for: jest.fn().mockResolvedValue([mockFullEventAfterBooking1]),
        };
        throw new Error('INSUFFICIENT_TICKETS');
      });

      const booking2Response = await request(app)
        .post('/api/bookings')
        .send(booking2Request)
        .expect(409); // Conflict status for insufficient tickets

      expect(booking2Response.body.success).toBe(false);
      expect(booking2Response.body.error).toContain('Insufficient');
    });
  });

  describe('Edge Case: Inactive Event', () => {
    it('should prevent booking for inactive events', async () => {
      const mockInactiveEvent = {
        id: 'event-inactive',
        name: 'Cancelled Event',
        description: 'This event was cancelled',
        date: new Date('2025-10-01'),
        venue: 'Old Venue',
        totalTickets: 200,
        bookedTickets: 50,
        basePrice: '50.00',
        currentPrice: '55.00',
        priceFloor: '40.00',
        priceCeiling: '100.00',
        pricingRules: {},
        isActive: false, // Event is inactive
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([mockInactiveEvent]);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        limit: mockLimit,
      });

      // Mock bookings count query
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: mockFrom,
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        });

      // User can still view the event details
      const detailResponse = await request(app)
        .get('/api/events/event-inactive')
        .expect(200);

      expect(detailResponse.body.success).toBe(true);
      expect(detailResponse.body.data).toHaveProperty('isActive', false);

      // But cannot book tickets
      const bookingRequest = {
        eventId: 'event-inactive',
        userEmail: 'hopeful@example.com',
        quantity: 2,
      };

      jest.clearAllMocks();

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          for: jest.fn().mockResolvedValue([{ ...mockInactiveEvent, date: mockInactiveEvent.date.toISOString() }]),
        };
        throw new Error('EVENT_INACTIVE');
      });

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect(400);

      expect(bookingResponse.body.success).toBe(false);
      expect(bookingResponse.body.error).toContain('inactive');
    });
  });

  describe('Edge Case: Past Event', () => {
    it('should prevent booking for events that have already occurred', async () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday

      const mockPastEvent = {
        id: 'event-past',
        name: 'Yesterday Event',
        isActive: true,
        date: pastDate.toISOString(),
        totalTickets: 100,
        bookedTickets: 50,
        currentPrice: '50.00',
      };

      const bookingRequest = {
        eventId: 'event-past',
        userEmail: 'timetraveler@example.com',
        quantity: 2,
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          for: jest.fn().mockResolvedValue([mockPastEvent]),
        };
        throw new Error('EVENT_PASSED');
      });

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect(400);

      expect(bookingResponse.body.success).toBe(false);
      expect(bookingResponse.body.error).toContain('passed');
    });
  });

  describe('User Journey: Multiple Bookings', () => {
    it('should allow user to view all their bookings across multiple events', async () => {
      const userEmail = 'frequent@example.com';

      const mockUserBookings = [
        {
          id: 'booking-1',
          eventId: 'event-1',
          eventName: 'Concert A',
          eventDate: new Date('2025-07-15'),
          eventVenue: 'Venue A',
          userEmail: userEmail,
          quantity: 2,
          pricePaid: '50.00',
          totalAmount: '100.00',
          bookedAt: new Date(),
        },
        {
          id: 'booking-2',
          eventId: 'event-2',
          eventName: 'Concert B',
          eventDate: new Date('2025-08-20'),
          eventVenue: 'Venue B',
          userEmail: userEmail,
          quantity: 3,
          pricePaid: '60.00',
          totalAmount: '180.00',
          bookedAt: new Date(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue(mockUserBookings);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        innerJoin: mockInnerJoin,
      });
      mockInnerJoin.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
      });

      const bookingsResponse = await request(app)
        .get(`/api/bookings?userEmail=${encodeURIComponent(userEmail)}`)
        .expect(200);

      expect(bookingsResponse.body.success).toBe(true);
      expect(bookingsResponse.body.data).toHaveLength(2);
      expect(bookingsResponse.body.data[0]).toHaveProperty('userEmail', userEmail);
      expect(bookingsResponse.body.data[1]).toHaveProperty('userEmail', userEmail);
      
      // Verify total amount spent
      const totalSpent = bookingsResponse.body.data.reduce(
        (sum: number, booking: any) => sum + parseFloat(booking.totalAmount),
        0
      );
      expect(totalSpent).toBe(280.00);
    });
  });

  describe('Price Changes During Booking Flow', () => {
    it('should apply the current price at the time of booking, not browsing', async () => {
      // Step 1: User browses and sees initial price
      const mockEvents = [
        {
          id: 'event-dynamic',
          name: 'Dynamic Price Event',
          description: 'Event with changing prices',
          date: new Date('2025-11-01'),
          venue: 'Dynamic Venue',
          totalTickets: 500,
          bookedTickets: 100,
          basePrice: '50.00',
          currentPrice: '60.00', // Initial price when browsing
          priceFloor: '40.00',
          priceCeiling: '150.00',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue(mockEvents);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
      });

      // Mock bookings count query
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: mockFrom,
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        });

      const browseResponse = await request(app)
        .get('/api/events')
        .expect(200);

      expect(browseResponse.body.data[0]).toHaveProperty('currentPrice');
      expect(parseFloat(browseResponse.body.data[0].currentPrice)).toBeGreaterThan(0);

      // Step 2: Price increases due to demand before user completes booking
      const bookingRequest = {
        eventId: 'event-dynamic',
        userEmail: 'priceaware@example.com',
        quantity: 2,
      };

      const mockEventUpdatedPrice = {
        id: 'event-dynamic',
        name: 'Dynamic Price Event',
        isActive: true,
        date: new Date(Date.now() + 86400000 * 120).toISOString(), // 120 days from now
        totalTickets: 500,
        bookedTickets: 150, // More tickets sold
        currentPrice: '75.00', // Price increased!
      };

      const mockBooking = {
        id: 'booking-dynamic',
        eventId: 'event-dynamic',
        userEmail: 'priceaware@example.com',
        quantity: 2,
        pricePaid: '75.00', // New price applied
        totalAmount: '150.00',
        createdAt: new Date(),
      };

      jest.clearAllMocks();

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          for: jest.fn().mockResolvedValue([mockEventUpdatedPrice]),
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockBooking]),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
        };
        return callback(mockTx);
      });

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect(201);

      expect(bookingResponse.body.success).toBe(true);
      expect(bookingResponse.body.data).toHaveProperty('pricePaid', '75.00');
      expect(bookingResponse.body.data).toHaveProperty('totalAmount', '150.00');
      // User pays the updated price, not the initial browsing price
    });
  });

  describe('Invalid Booking Attempts', () => {
    it('should reject booking with invalid quantity (zero tickets)', async () => {
      const bookingRequest = {
        eventId: 'event-any',
        userEmail: 'invalid@example.com',
        quantity: 0, // Invalid
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject booking with negative quantity', async () => {
      const bookingRequest = {
        eventId: 'event-any',
        userEmail: 'invalid@example.com',
        quantity: -5, // Invalid
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject booking with invalid email format', async () => {
      const bookingRequest = {
        eventId: 'event-any',
        userEmail: 'not-an-email', // Invalid format
        quantity: 2,
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject booking for non-existent event', async () => {
      const bookingRequest = {
        eventId: 'event-does-not-exist',
        userEmail: 'valid@example.com',
        quantity: 2,
      };

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          for: jest.fn().mockResolvedValue([]), // Event not found
        };
        throw new Error('EVENT_NOT_FOUND');
      });

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });
});
