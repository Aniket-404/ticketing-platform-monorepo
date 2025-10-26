import { Router, Request, Response } from 'express';
import { db, events, bookings, type NewBooking, type Event } from '@repo/database';
import { eq, sql, and, gte } from 'drizzle-orm';
import { 
  calculateDynamicPrice, 
  calculateDemandFactor, 
  calculateTimeFactor, 
  calculateInventoryFactor 
} from '../utils/pricing';

const router: Router = Router();

/**
 * Helper function to calculate dynamic price for an event
 */
async function calculateEventPrice(event: Event): Promise<number> {
  // Calculate days until event
  const now = new Date();
  const eventDate = new Date(event.date);
  const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate total planning period (assume 90 days from creation)
  const createdDate = new Date(event.createdAt);
  const totalDays = Math.ceil((eventDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Get recent bookings count (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentBookingsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.eventId, event.id),
        gte(bookings.createdAt, oneDayAgo)
      )
    );
  
  const recentBookings = recentBookingsResult[0]?.count || 0;
  
  // Calculate remaining capacity
  const remainingCapacity = event.totalTickets - event.bookedTickets;
  
  // Calculate pricing factors
  const demandFactor = calculateDemandFactor(recentBookings, 50); // Assume max 50 bookings per day
  const timeFactor = daysUntilEvent > 0 ? calculateTimeFactor(daysUntilEvent, totalDays) : 1;
  const inventoryFactor = calculateInventoryFactor(remainingCapacity, event.totalTickets);
  
  // Calculate dynamic price
  const basePrice = parseFloat(event.basePrice);
  const dynamicPrice = calculateDynamicPrice({
    basePrice,
    factors: {
      demandFactor,
      timeFactor,
      inventoryFactor,
    },
  });
  
  // Apply floor and ceiling constraints
  const priceFloor = parseFloat(event.priceFloor);
  const priceCeiling = parseFloat(event.priceCeiling);
  const finalPrice = Math.max(priceFloor, Math.min(priceCeiling, dynamicPrice));
  
  return finalPrice;
}

/**
 * POST /api/bookings
 * Create a new booking for an event
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { eventId, userEmail, quantity } = req.body;
    
    // Validation
    if (!eventId || typeof eventId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Event ID is required and must be a string',
      });
      return;
    }
    
    if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Valid user email is required',
      });
      return;
    }
    
    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Quantity must be a positive number',
      });
      return;
    }
    
    // Start transaction for concurrency control
    const result = await db.transaction(async (tx) => {
      // Fetch event with row-level lock (FOR UPDATE)
      const eventResult = await tx
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1)
        .for('update');
      
      if (eventResult.length === 0) {
        throw new Error('EVENT_NOT_FOUND');
      }
      
      const event = eventResult[0];
      if (!event) {
        throw new Error('EVENT_NOT_FOUND');
      }
      
      if (!event.isActive) {
        throw new Error('EVENT_INACTIVE');
      }
      
      // Check if event date has passed
      if (new Date(event.date) <= new Date()) {
        throw new Error('EVENT_PASSED');
      }
      
      // Check availability
      const availableTickets = event.totalTickets - event.bookedTickets;
      if (availableTickets < quantity) {
        throw new Error('INSUFFICIENT_TICKETS');
      }
      
      // Calculate dynamic price at booking time (snapshot)
      const pricePaid = await calculateEventPrice(event);
      const totalAmount = pricePaid * quantity;
      
      // Create booking
      const newBooking: NewBooking = {
        eventId: event.id,
        userEmail,
        quantity,
        pricePaid: pricePaid.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      };
      
      const bookingResult = await tx.insert(bookings).values(newBooking).returning();
      const createdBooking = bookingResult[0];
      
      if (!createdBooking) {
        throw new Error('BOOKING_CREATION_FAILED');
      }
      
      // Update event's booked tickets count
      await tx
        .update(events)
        .set({ 
          bookedTickets: event.bookedTickets + quantity,
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId));
      
      return { booking: createdBooking, event };
    });
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        bookingId: result.booking.id,
        eventId: result.booking.eventId,
        eventName: result.event.name,
        userEmail: result.booking.userEmail,
        quantity: result.booking.quantity,
        pricePaid: result.booking.pricePaid,
        totalAmount: result.booking.totalAmount,
        bookedAt: result.booking.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      switch (error.message) {
        case 'EVENT_NOT_FOUND':
          res.status(404).json({
            success: false,
            error: 'Event not found',
            message: 'The specified event does not exist',
          });
          return;
        
        case 'EVENT_INACTIVE':
          res.status(400).json({
            success: false,
            error: 'Event inactive',
            message: 'This event is no longer available for booking',
          });
          return;
        
        case 'EVENT_PASSED':
          res.status(400).json({
            success: false,
            error: 'Event passed',
            message: 'Cannot book tickets for past events',
          });
          return;
        
        case 'INSUFFICIENT_TICKETS':
          res.status(409).json({
            success: false,
            error: 'Insufficient tickets',
            message: 'Not enough tickets available for this event',
          });
          return;
        
        case 'BOOKING_CREATION_FAILED':
          res.status(500).json({
            success: false,
            error: 'Booking creation failed',
            message: 'Failed to create booking record',
          });
          return;
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/bookings
 * Get bookings (optionally filter by email or event)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userEmail, eventId } = req.query;
    
    // Build conditions
    const conditions = [];
    if (userEmail && typeof userEmail === 'string') {
      conditions.push(eq(bookings.userEmail, userEmail));
    }
    if (eventId && typeof eventId === 'string') {
      conditions.push(eq(bookings.eventId, eventId));
    }
    
    // Build and execute query
    const baseQuery = db.select({
      id: bookings.id,
      eventId: bookings.eventId,
      eventName: events.name,
      eventDate: events.date,
      eventVenue: events.venue,
      userEmail: bookings.userEmail,
      quantity: bookings.quantity,
      pricePaid: bookings.pricePaid,
      totalAmount: bookings.totalAmount,
      bookedAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(events, eq(bookings.eventId, events.id));
    
    const result = conditions.length > 0
      ? await baseQuery.where(conditions.length === 1 ? conditions[0]! : and(...conditions)).orderBy(sql`${bookings.createdAt} DESC`)
      : await baseQuery.orderBy(sql`${bookings.createdAt} DESC`);
    
    res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/bookings/:id
 * Get a specific booking by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Booking ID is required',
      });
      return;
    }
    
    const result = await db
      .select({
        id: bookings.id,
        eventId: bookings.eventId,
        eventName: events.name,
        eventDescription: events.description,
        eventDate: events.date,
        eventVenue: events.venue,
        userEmail: bookings.userEmail,
        quantity: bookings.quantity,
        pricePaid: bookings.pricePaid,
        totalAmount: bookings.totalAmount,
        bookedAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(bookings.id, id))
      .limit(1);
    
    if (result.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Booking not found',
        message: `No booking found with ID: ${id}`,
      });
      return;
    }
    
    res.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
