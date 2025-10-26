import { Router, Request, Response } from 'express';
import { db, events, bookings, type Event, type NewEvent } from '@repo/database';
import { eq, sql, gte, and } from 'drizzle-orm';
import { requireApiKey } from '../middleware/auth';
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
async function calculateEventPrice(event: Event): Promise<string> {
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
  
  return finalPrice.toFixed(2);
}

/**
 * GET /api/events
 * Get all active events with dynamic pricing
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const allEvents = await db
      .select()
      .from(events)
      .where(eq(events.isActive, true))
      .orderBy(events.date);
    
    // Calculate dynamic pricing for each event
    const eventsWithPricing = await Promise.all(
      allEvents.map(async (event) => {
        const currentPrice = await calculateEventPrice(event);
        return {
          id: event.id,
          name: event.name,
          description: event.description,
          date: event.date,
          venue: event.venue,
          totalTickets: event.totalTickets,
          availableTickets: event.totalTickets - event.bookedTickets,
          bookedTickets: event.bookedTickets,
          basePrice: event.basePrice,
          currentPrice,
          priceFloor: event.priceFloor,
          priceCeiling: event.priceCeiling,
          createdAt: event.createdAt,
        };
      })
    );
    
    res.json({
      success: true,
      count: eventsWithPricing.length,
      data: eventsWithPricing,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/events/:id
 * Get a specific event by ID with dynamic pricing
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Event ID is required',
      });
      return;
    }
    
    const result = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    
    if (result.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
        message: `No event found with ID: ${id}`,
      });
      return;
    }
    
    const event = result[0];
    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
      });
      return;
    }
    
    // Calculate dynamic price
    const currentPrice = await calculateEventPrice(event);
    
    res.json({
      success: true,
      data: {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        venue: event.venue,
        totalTickets: event.totalTickets,
        availableTickets: event.totalTickets - event.bookedTickets,
        bookedTickets: event.bookedTickets,
        basePrice: event.basePrice,
        currentPrice,
        priceFloor: event.priceFloor,
        priceCeiling: event.priceCeiling,
        pricingRules: event.pricingRules,
        isActive: event.isActive,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/events
 * Create a new event (requires API key authentication)
 */
router.post('/', requireApiKey, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      date,
      venue,
      totalTickets,
      basePrice,
      priceFloor,
      priceCeiling,
      pricingRules,
    } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Event name is required and must be a string',
      });
      return;
    }
    
    if (!description || typeof description !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Event description is required and must be a string',
      });
      return;
    }
    
    if (!date) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Event date is required',
      });
      return;
    }
    
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime()) || eventDate <= new Date()) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Event date must be a valid future date',
      });
      return;
    }
    
    if (!venue || typeof venue !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Event venue is required and must be a string',
      });
      return;
    }
    
    if (!totalTickets || typeof totalTickets !== 'number' || totalTickets <= 0) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Total tickets must be a positive number',
      });
      return;
    }
    
    if (!basePrice || typeof basePrice !== 'number' || basePrice <= 0) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Base price must be a positive number',
      });
      return;
    }
    
    // Use defaults if not provided
    const finalPriceFloor = priceFloor || basePrice * 0.75;
    const finalPriceCeiling = priceCeiling || basePrice * 2.5;
    
    if (finalPriceFloor >= finalPriceCeiling) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Price floor must be less than price ceiling',
      });
      return;
    }
    
    if (basePrice < finalPriceFloor || basePrice > finalPriceCeiling) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Base price must be between price floor and ceiling',
      });
      return;
    }
    
    // Default pricing rules if not provided
    const finalPricingRules = pricingRules || {
      timeBasedWeight: 0.3,
      demandBasedWeight: 0.4,
      inventoryBasedWeight: 0.3,
    };
    
    // Validate pricing rules
    if (
      typeof finalPricingRules.timeBasedWeight !== 'number' ||
      typeof finalPricingRules.demandBasedWeight !== 'number' ||
      typeof finalPricingRules.inventoryBasedWeight !== 'number'
    ) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Pricing rules must contain numeric weights',
      });
      return;
    }
    
    // Create new event
    const newEvent: NewEvent = {
      name,
      description,
      date: eventDate,
      venue,
      totalTickets,
      bookedTickets: 0,
      basePrice: basePrice.toFixed(2),
      currentPrice: basePrice.toFixed(2),
      priceFloor: finalPriceFloor.toFixed(2),
      priceCeiling: finalPriceCeiling.toFixed(2),
      pricingRules: finalPricingRules,
      isActive: true,
    };
    
    const result = await db.insert(events).values(newEvent).returning();
    const createdEvent = result[0];
    
    if (!createdEvent) {
      res.status(500).json({
        success: false,
        error: 'Failed to create event',
      });
      return;
    }
    
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        id: createdEvent.id,
        name: createdEvent.name,
        description: createdEvent.description,
        date: createdEvent.date,
        venue: createdEvent.venue,
        totalTickets: createdEvent.totalTickets,
        availableTickets: createdEvent.totalTickets - createdEvent.bookedTickets,
        basePrice: createdEvent.basePrice,
        currentPrice: createdEvent.currentPrice,
        priceFloor: createdEvent.priceFloor,
        priceCeiling: createdEvent.priceCeiling,
        pricingRules: createdEvent.pricingRules,
        createdAt: createdEvent.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
