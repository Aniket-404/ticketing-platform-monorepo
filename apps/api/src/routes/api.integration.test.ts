/**
 * Integration Tests for API Endpoints
 * 
 * This test suite provides comprehensive integration testing for all REST API endpoints,
 * validating request/response cycles, data integrity, and error handling using supertest.
 */

import request from 'supertest';
import express, { Express } from 'express';
import eventsRouter from './events';
import bookingsRouter from './bookings';
import analyticsRouter from './analytics';
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
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  requireApiKey: jest.fn((_req, _res, next) => next()),
}));

describe('API Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/events', eventsRouter);
    app.use('/api/bookings', bookingsRouter);
    app.use('/api/analytics', analyticsRouter);
  });

  describe('Events API - GET /api/events', () => {
    it('should return all active events with 200 status', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Test Event 1',
          description: 'Description 1',
          date: new Date('2025-12-01'),
          venue: 'Venue 1',
          totalTickets: 100,
          bookedTickets: 30,
          basePrice: '50.00',
          currentPrice: '55.00',
          priceFloor: '40.00',
          priceCeiling: '100.00',
          createdAt: new Date(),
          isActive: true,
        },
        {
          id: 'event-2',
          name: 'Test Event 2',
          description: 'Description 2',
          date: new Date('2025-12-15'),
          venue: 'Venue 2',
          totalTickets: 200,
          bookedTickets: 50,
          basePrice: '75.00',
          currentPrice: '80.00',
          priceFloor: '60.00',
          priceCeiling: '150.00',
          createdAt: new Date(),
          isActive: true,
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
      (db.select as jest.Mock).mockReturnValueOnce({
        from: mockFrom,
      }).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const response = await request(app)
        .get('/api/events')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/events')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Events API - GET /api/events/:id', () => {
    it('should return a specific event by ID with 200 status', async () => {
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        description: 'Test Description',
        date: new Date('2025-12-01'),
        venue: 'Test Venue',
        totalTickets: 100,
        bookedTickets: 30,
        basePrice: '50.00',
        currentPrice: '55.00',
        priceFloor: '40.00',
        priceCeiling: '100.00',
        pricingRules: {
          timeBasedWeight: 0.3,
          demandBasedWeight: 0.4,
          inventoryBasedWeight: 0.3,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([mockEvent]);

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
      (db.select as jest.Mock).mockReturnValueOnce({
        from: mockFrom,
      }).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const response = await request(app)
        .get('/api/events/event-123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 'event-123');
      expect(response.body.data).toHaveProperty('name', 'Test Event');
    });

    it('should return 404 for non-existent event', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([]);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        limit: mockLimit,
      });

      const response = await request(app)
        .get('/api/events/non-existent-id')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Event not found');
    });
  });

  describe('Events API - POST /api/events', () => {
    it('should create a new event with valid data', async () => {
      const newEvent = {
        name: 'New Test Event',
        description: 'New Event Description',
        date: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
        venue: 'Test Venue',
        totalTickets: 150,
        basePrice: 60,
        priceFloor: 45,
        priceCeiling: 120,
      };

      const mockCreatedEvent = {
        id: 'new-event-123',
        ...newEvent,
        date: new Date(newEvent.date),
        bookedTickets: 0,
        basePrice: '60.00',
        currentPrice: '60.00',
        priceFloor: '45.00',
        priceCeiling: '120.00',
        pricingRules: {
          timeBasedWeight: 0.3,
          demandBasedWeight: 0.4,
          inventoryBasedWeight: 0.3,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = jest.fn().mockReturnThis();
      const mockValues = jest.fn().mockReturnThis();
      const mockReturning = jest.fn().mockResolvedValue([mockCreatedEvent]);

      (db.insert as jest.Mock).mockReturnValue({
        values: mockValues,
      });
      mockValues.mockReturnValue({
        returning: mockReturning,
      });

      const response = await request(app)
        .post('/api/events')
        .send(newEvent)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Event created successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', 'New Test Event');
    });

    it('should reject event creation with missing required fields', async () => {
      const invalidEvent = {
        name: 'Test Event',
        // Missing description, date, venue, etc.
      };

      const response = await request(app)
        .post('/api/events')
        .send(invalidEvent)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should reject event with past date', async () => {
      const eventWithPastDate = {
        name: 'Past Event',
        description: 'Event in the past',
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        venue: 'Test Venue',
        totalTickets: 100,
        basePrice: 50,
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventWithPastDate)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(response.body.message).toContain('future date');
    });

    it('should reject event with invalid price constraints', async () => {
      const eventWithBadPrices = {
        name: 'Bad Prices Event',
        description: 'Event with bad pricing',
        date: new Date(Date.now() + 86400000 * 30).toISOString(),
        venue: 'Test Venue',
        totalTickets: 100,
        basePrice: 50,
        priceFloor: 100, // Floor higher than ceiling
        priceCeiling: 80,
      };

      const response = await request(app)
        .post('/api/events')
        .send(eventWithBadPrices)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('Bookings API - POST /api/bookings', () => {
    it('should create a booking successfully', async () => {
      const bookingRequest = {
        eventId: 'event-123',
        userEmail: 'test@example.com',
        quantity: 2,
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        isActive: true,
        date: new Date(Date.now() + 86400000).toISOString(),
        totalTickets: 100,
        bookedTickets: 50,
        currentPrice: '50.00',
      };

      const mockBooking = {
        id: 'booking-123',
        eventId: 'event-123',
        userEmail: 'test@example.com',
        quantity: 2,
        pricePaid: '50.00',
        totalAmount: '100.00',
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
          returning: jest.fn().mockResolvedValue([mockBooking]),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
        };
        return callback(mockTx);
      });

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingRequest)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Booking created successfully');
      expect(response.body.data).toHaveProperty('bookingId', 'booking-123');
    });

    it('should reject booking with invalid data', async () => {
      const invalidBooking = {
        eventId: 'event-123',
        // Missing userEmail and quantity
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(invalidBooking)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('Bookings API - GET /api/bookings', () => {
    it('should return all bookings', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          eventId: 'event-1',
          eventName: 'Event 1',
          eventDate: new Date(),
          eventVenue: 'Venue 1',
          userEmail: 'user1@example.com',
          quantity: 2,
          pricePaid: '50.00',
          totalAmount: '100.00',
          bookedAt: new Date(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue(mockBookings);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        innerJoin: mockInnerJoin,
      });
      mockInnerJoin.mockReturnValue({
        orderBy: mockOrderBy,
      });

      const response = await request(app)
        .get('/api/bookings')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter bookings by userEmail', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          eventId: 'event-1',
          eventName: 'Event 1',
          eventDate: new Date(),
          eventVenue: 'Venue 1',
          userEmail: 'test@example.com',
          quantity: 2,
          pricePaid: '50.00',
          totalAmount: '100.00',
          bookedAt: new Date(),
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue(mockBookings);

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

      const response = await request(app)
        .get('/api/bookings?userEmail=test@example.com')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('Bookings API - GET /api/bookings/:id', () => {
    it('should return a specific booking by ID', async () => {
      const mockBooking = {
        id: 'booking-123',
        eventId: 'event-1',
        eventName: 'Test Event',
        eventDescription: 'Description',
        eventDate: new Date(),
        eventVenue: 'Venue',
        userEmail: 'test@example.com',
        quantity: 2,
        pricePaid: '50.00',
        totalAmount: '100.00',
        bookedAt: new Date(),
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([mockBooking]);

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
        limit: mockLimit,
      });

      const response = await request(app)
        .get('/api/bookings/booking-123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', 'booking-123');
    });

    it('should return 404 for non-existent booking', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([]);

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
        limit: mockLimit,
      });

      const response = await request(app)
        .get('/api/bookings/non-existent')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Booking not found');
    });
  });

  describe('Analytics API - GET /api/analytics/events/:id', () => {
    it('should return analytics for a specific event', async () => {
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        date: new Date(),
        venue: 'Test Venue',
        totalTickets: 100,
        bookedTickets: 30,
        basePrice: '50.00',
        currentPrice: '55.00',
      };

      const mockAnalytics = {
        totalBookings: 10,
        totalTicketsSold: 30,
        totalRevenue: '1500.00',
        averageTicketPrice: '50.00',
      };

      // Mock event query
      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([mockEvent]);

      // Mock analytics query
      const mockAnalyticsSelect = jest.fn().mockReturnThis();
      const mockAnalyticsFrom = jest.fn().mockReturnThis();
      const mockAnalyticsWhere = jest.fn().mockResolvedValue([mockAnalytics]);

      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: mockFrom,
        })
        .mockReturnValueOnce({
          from: mockAnalyticsFrom,
        });

      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        limit: mockLimit,
      });

      mockAnalyticsFrom.mockReturnValue({
        where: mockAnalyticsWhere,
      });

      const response = await request(app)
        .get('/api/analytics/events/event-123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('event');
      expect(response.body.data).toHaveProperty('capacity');
      expect(response.body.data).toHaveProperty('bookings');
      expect(response.body.data).toHaveProperty('revenue');
    });

    it('should return 404 for non-existent event analytics', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([]);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        limit: mockLimit,
      });

      const response = await request(app)
        .get('/api/analytics/events/non-existent')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Event not found');
    });
  });

  describe('Analytics API - GET /api/analytics/summary', () => {
    it('should return system-wide analytics summary', async () => {
      const mockEventsCount = {
        total: 10,
        active: 8,
        inactive: 2,
      };

      const mockBookingAnalytics = {
        totalBookings: 50,
        totalTicketsSold: 150,
        totalRevenue: '7500.00',
        averageTicketPrice: '50.00',
        averageBookingSize: '3.00',
      };

      const mockCapacity = {
        totalCapacity: 1000,
        totalBooked: 300,
      };

      const mockTopEvents = [
        {
          eventId: 'event-1',
          eventName: 'Event 1',
          totalRevenue: '2000.00',
          ticketsSold: 40,
        },
      ];

      // Mock multiple queries
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue([mockEventsCount]),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue([mockBookingAnalytics]),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([mockCapacity]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue(mockTopEvents),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue(mockTopEvents),
                }),
              }),
            }),
          }),
        });

      const response = await request(app)
        .get('/api/analytics/summary')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('events');
      expect(response.body.data).toHaveProperty('capacity');
      expect(response.body.data).toHaveProperty('bookings');
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('topEvents');
    });

    it('should handle errors when fetching summary analytics', async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/analytics/summary')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express will handle this before it reaches our routes
      expect(response.status).toBe(400);
    });

    it('should handle database connection failures', async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const response = await request(app)
        .get('/api/events')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Request/Response Cycle Validation', () => {
    it('should accept JSON content type', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue([]);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
      });

      const response = await request(app)
        .get('/api/events')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);

      expect(response.status).toBeLessThan(500);
    });

    it('should set appropriate response headers', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue([]);

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
      });

      const response = await request(app).get('/api/events');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});
