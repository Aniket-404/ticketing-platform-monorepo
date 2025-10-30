/**
 * Unit Tests for Booking Logic and Concurrency
 * 
 * This test suite provides comprehensive coverage for booking operations,
 * focusing on concurrency control, ticket allocation, and error handling.
 */

import { Request, Response } from 'express';
import bookingsRouter from './bookings';
import { db } from '@repo/database';

// Mock the database module
jest.mock('@repo/database', () => {
  const mockWhere = jest.fn().mockResolvedValue([{ count: 0 }]);
  const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
  
  return {
    db: {
      transaction: jest.fn(),
      select: mockSelect,
      insert: jest.fn(),
      update: jest.fn(),
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
  };
});

// Mock drizzle-orm functions
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((_field, value) => ({ field: _field, value })),
  and: jest.fn((...conditions) => ({ type: 'and', conditions })),
  sql: jest.fn((strings, ...values) => ({ strings, values })),
  gte: jest.fn((_field, value) => ({ field: _field, value, op: 'gte' })),
}));

describe('Booking Logic and Concurrency', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup response mock
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    // Setup request mock
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
  });

  describe('POST /api/bookings - Create Booking', () => {
    describe('Input Validation', () => {
      it('should reject booking without eventId', async () => {
        mockRequest.body = {
          userEmail: 'test@example.com',
          quantity: 2,
        };

        // Get the POST handler
        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Validation error',
          message: 'Event ID is required and must be a string',
        });
      });

      it('should reject booking with invalid eventId type', async () => {
        mockRequest.body = {
          eventId: 123, // Should be string
          userEmail: 'test@example.com',
          quantity: 2,
        };

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Validation error',
          message: 'Event ID is required and must be a string',
        });
      });

      it('should reject booking without userEmail', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          quantity: 2,
        };

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Validation error',
          message: 'Valid user email is required',
        });
      });

      it('should reject booking with invalid email format', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'invalid-email', // No @ symbol
          quantity: 2,
        };

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Validation error',
          message: 'Valid user email is required',
        });
      });

      it('should reject booking without quantity', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
        };

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Validation error',
          message: 'Quantity must be a positive number',
        });
      });

      it('should reject booking with zero quantity', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 0,
        };

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Validation error',
          message: 'Quantity must be a positive number',
        });
      });

      it('should reject booking with negative quantity', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: -5,
        };

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Validation error',
          message: 'Quantity must be a positive number',
        });
      });
    });

    describe('Event Validation', () => {
      it('should return 404 when event does not exist', async () => {
        mockRequest.body = {
          eventId: 'non-existent-event',
          userEmail: 'test@example.com',
          quantity: 2,
        };

        // Mock transaction that returns empty event result
        (db.transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            for: jest.fn().mockResolvedValue([]), // Empty result
          };
          return callback(mockTx);
        });

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(404);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Event not found',
          message: 'The specified event does not exist',
        });
      });

      it('should reject booking for inactive event', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 2,
        };

        const mockEvent = {
          id: 'event-123',
          name: 'Test Event',
          isActive: false, // Inactive event
          date: new Date(Date.now() + 86400000).toISOString(),
          totalTickets: 100,
          bookedTickets: 50,
          currentPrice: '50.00',
        };

        (db.transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            for: jest.fn().mockResolvedValue([mockEvent]),
          };
          return callback(mockTx);
        });

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Event inactive',
          message: 'This event is no longer available for booking',
        });
      });

      it('should reject booking for past event', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 2,
        };

        const mockEvent = {
          id: 'event-123',
          name: 'Test Event',
          isActive: true,
          date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          totalTickets: 100,
          bookedTickets: 50,
          currentPrice: '50.00',
        };

        (db.transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            for: jest.fn().mockResolvedValue([mockEvent]),
          };
          return callback(mockTx);
        });

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Event passed',
          message: 'Cannot book tickets for past events',
        });
      });
    });

    describe('Ticket Availability and Overbooking Prevention', () => {
      it('should reject booking when insufficient tickets available', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 60, // Requesting more than available
        };

        const mockEvent = {
          id: 'event-123',
          name: 'Test Event',
          isActive: true,
          date: new Date(Date.now() + 86400000).toISOString(),
          totalTickets: 100,
          bookedTickets: 50, // Only 50 tickets available
          currentPrice: '50.00',
        };

        (db.transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            for: jest.fn().mockResolvedValue([mockEvent]),
          };
          return callback(mockTx);
        });

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Insufficient tickets',
          message: 'Not enough tickets available for this event',
        });
      });

      it('should reject booking when exactly no tickets available', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 1,
        };

        const mockEvent = {
          id: 'event-123',
          name: 'Test Event',
          isActive: true,
          date: new Date(Date.now() + 86400000).toISOString(),
          totalTickets: 100,
          bookedTickets: 100, // Sold out
          currentPrice: '50.00',
        };

        (db.transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            for: jest.fn().mockResolvedValue([mockEvent]),
          };
          return callback(mockTx);
        });

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Insufficient tickets',
          message: 'Not enough tickets available for this event',
        });
      });

      it('should allow booking when exactly enough tickets available', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 50, // Exactly the remaining amount
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
          quantity: 50,
          pricePaid: '50.00',
          totalAmount: '2500.00',
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

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(201);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Booking created successfully',
          })
        );
      });
    });

    describe('Successful Booking Creation', () => {
      it('should create booking with correct price calculation', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 3,
        };

        const mockEvent = {
          id: 'event-123',
          name: 'Test Event',
          isActive: true,
          date: new Date(Date.now() + 86400000).toISOString(),
          totalTickets: 100,
          bookedTickets: 50,
          currentPrice: '75.50',
        };

        const mockBooking = {
          id: 'booking-123',
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 3,
          pricePaid: '75.50',
          totalAmount: '226.50', // 75.50 * 3
          createdAt: new Date(),
        };

        let updateCalled = false;
        let updatedBookedTickets = 0;

        (db.transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx: any = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            for: jest.fn().mockResolvedValue([mockEvent]),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([mockBooking]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn((values: any): any => {
              updateCalled = true;
              updatedBookedTickets = values.bookedTickets;
              return mockTx;
            }),
          };
          return callback(mockTx);
        });

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(201);
        expect(mockJson).toHaveBeenCalledWith({
          success: true,
          message: 'Booking created successfully',
          data: {
            bookingId: 'booking-123',
            eventId: 'event-123',
            eventName: 'Test Event',
            userEmail: 'test@example.com',
            quantity: 3,
            pricePaid: '75.50',
            totalAmount: '226.50',
            bookedAt: mockBooking.createdAt,
          },
        });

        // Verify that booked tickets were updated
        expect(updateCalled).toBe(true);
        expect(updatedBookedTickets).toBe(53); // 50 + 3
      });

      it('should create booking for single ticket', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'single@example.com',
          quantity: 1,
        };

        const mockEvent = {
          id: 'event-123',
          name: 'Test Event',
          isActive: true,
          date: new Date(Date.now() + 86400000).toISOString(),
          totalTickets: 100,
          bookedTickets: 99,
          currentPrice: '100.00',
        };

        const mockBooking = {
          id: 'booking-456',
          eventId: 'event-123',
          userEmail: 'single@example.com',
          quantity: 1,
          pricePaid: '100.00',
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

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(201);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              quantity: 1,
              totalAmount: '100.00',
            }),
          })
        );
      });
    });

    describe('Concurrency Control', () => {
      it('should use database transaction for atomic operations', async () => {
        mockRequest.body = {
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

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        // Verify transaction was called
        expect(db.transaction).toHaveBeenCalled();
      });

      it('should use row-level locking (FOR UPDATE) to prevent race conditions', async () => {
        mockRequest.body = {
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

        let forUpdateCalled = false;

        (db.transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            for: jest.fn((lockMode: string) => {
              forUpdateCalled = lockMode === 'update';
              return Promise.resolve([mockEvent]);
            }),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([mockBooking]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
          };
          return callback(mockTx);
        });

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        // Verify FOR UPDATE was called
        expect(forUpdateCalled).toBe(true);
      });

      it('should rollback transaction on booking creation failure', async () => {
        mockRequest.body = {
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

        (db.transaction as jest.Mock).mockImplementation(async (callback) => {
          const mockTx = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            for: jest.fn().mockResolvedValue([mockEvent]),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([]), // Failed to create booking
          };
          return callback(mockTx);
        });

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Booking creation failed',
          message: 'Failed to create booking record',
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 2,
        };

        (db.transaction as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to create booking',
          message: 'Database connection failed',
        });
      });

      it('should handle unexpected errors', async () => {
        mockRequest.body = {
          eventId: 'event-123',
          userEmail: 'test@example.com',
          quantity: 2,
        };

        (db.transaction as jest.Mock).mockRejectedValue('Unexpected error');

        const postHandler = (bookingsRouter as any).stack.find(
          (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
        )?.route?.stack?.[0]?.handle;

        await postHandler(mockRequest as Request, mockResponse as Response);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to create booking',
          message: 'Unknown error',
        });
      });
    });
  });

  describe('GET /api/bookings - List Bookings', () => {
    it('should return all bookings when no filters provided', async () => {
      mockRequest.query = {};

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
        {
          id: 'booking-2',
          eventId: 'event-2',
          eventName: 'Event 2',
          eventDate: new Date(),
          eventVenue: 'Venue 2',
          userEmail: 'user2@example.com',
          quantity: 3,
          pricePaid: '75.00',
          totalAmount: '225.00',
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

      const getHandler = (bookingsRouter as any).stack.find(
        (layer: any) => layer.route?.path === '/' && layer.route?.methods?.get
      )?.route?.stack?.[0]?.handle;

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockBookings,
      });
    });

    it('should filter bookings by userEmail', async () => {
      mockRequest.query = {
        userEmail: 'test@example.com',
      };

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

      const getHandler = (bookingsRouter as any).stack.find(
        (layer: any) => layer.route?.path === '/' && layer.route?.methods?.get
      )?.route?.stack?.[0]?.handle;

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        count: 1,
        data: mockBookings,
      });
    });

    it('should handle errors when fetching bookings', async () => {
      mockRequest.query = {};

      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const getHandler = (bookingsRouter as any).stack.find(
        (layer: any) => layer.route?.path === '/' && layer.route?.methods?.get
      )?.route?.stack?.[0]?.handle;

      await getHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch bookings',
        message: 'Database error',
      });
    });
  });

  describe('GET /api/bookings/:id - Get Single Booking', () => {
    it('should return booking by ID', async () => {
      mockRequest.params = {
        id: 'booking-123',
      };

      const mockBooking = {
        id: 'booking-123',
        eventId: 'event-1',
        eventName: 'Event 1',
        eventDescription: 'Description',
        eventDate: new Date(),
        eventVenue: 'Venue 1',
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

      const getByIdHandler = (bookingsRouter as any).stack.find(
        (layer: any) => layer.route?.path === '/:id' && layer.route?.methods?.get
      )?.route?.stack?.[0]?.handle;

      await getByIdHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockBooking,
      });
    });

    it('should return 404 when booking not found', async () => {
      mockRequest.params = {
        id: 'non-existent',
      };

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

      const getByIdHandler = (bookingsRouter as any).stack.find(
        (layer: any) => layer.route?.path === '/:id' && layer.route?.methods?.get
      )?.route?.stack?.[0]?.handle;

      await getByIdHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Booking not found',
        message: 'No booking found with ID: non-existent',
      });
    });

    it('should handle errors when fetching single booking', async () => {
      mockRequest.params = {
        id: 'booking-123',
      };

      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const getByIdHandler = (bookingsRouter as any).stack.find(
        (layer: any) => layer.route?.path === '/:id' && layer.route?.methods?.get
      )?.route?.stack?.[0]?.handle;

      await getByIdHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch booking',
        message: 'Database error',
      });
    });
  });
});
