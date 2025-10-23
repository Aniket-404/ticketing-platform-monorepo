import { Router, Request, Response } from 'express';
import { db, events, bookings, type Event } from '@repo/database';

const router: Router = Router();

/**
 * POST /api/seed
 * Seeds the database with sample events and bookings
 * Idempotent - clears existing data before seeding
 */
router.post('/', async (_req: Request, res: Response) => {
  try {
    console.log('Starting database seed...');

    // Clear existing data (idempotency)
    await db.delete(bookings); // Delete bookings first due to foreign key constraint
    await db.delete(events);
    console.log('Cleared existing data');

    // Sample events with different pricing configurations
    const sampleEvents = [
      {
        name: "Tech Conference 2025",
        description: "Annual technology conference featuring industry leaders and innovators",
        date: new Date("2025-12-15T09:00:00Z"),
        venue: "Convention Center, Downtown",
        totalTickets: 500,
        bookedTickets: 0,
        basePrice: "100.00",
        currentPrice: "100.00",
        priceFloor: "75.00",
        priceCeiling: "200.00",
        pricingRules: {
          timeBasedWeight: 0.3,
          demandBasedWeight: 0.4,
          inventoryBasedWeight: 0.3,
        },
      },
      {
        name: "Rock Concert - The Electrics",
        description: "Live performance by The Electrics with special guest performers",
        date: new Date("2025-11-20T20:00:00Z"),
        venue: "City Arena",
        totalTickets: 1000,
        bookedTickets: 0,
        basePrice: "75.00",
        currentPrice: "75.00",
        priceFloor: "50.00",
        priceCeiling: "150.00",
        pricingRules: {
          timeBasedWeight: 0.25,
          demandBasedWeight: 0.5,
          inventoryBasedWeight: 0.25,
        },
      },
      {
        name: "Comedy Night - Stand Up Special",
        description: "An evening of laughter with top comedians from around the country",
        date: new Date("2025-11-05T19:30:00Z"),
        venue: "Comedy Club Central",
        totalTickets: 200,
        bookedTickets: 0,
        basePrice: "50.00",
        currentPrice: "50.00",
        priceFloor: "40.00",
        priceCeiling: "100.00",
        pricingRules: {
          timeBasedWeight: 0.2,
          demandBasedWeight: 0.3,
          inventoryBasedWeight: 0.5,
        },
      },
      {
        name: "Food & Wine Festival",
        description: "Taste exquisite dishes and fine wines from renowned chefs and vintners",
        date: new Date("2026-01-10T17:00:00Z"),
        venue: "Riverside Park",
        totalTickets: 750,
        bookedTickets: 0,
        basePrice: "120.00",
        currentPrice: "120.00",
        priceFloor: "90.00",
        priceCeiling: "250.00",
        pricingRules: {
          timeBasedWeight: 0.35,
          demandBasedWeight: 0.35,
          inventoryBasedWeight: 0.3,
        },
      },
      {
        name: "Art Exhibition Opening",
        description: "Exclusive opening night for the Modern Art Exhibition featuring local artists",
        date: new Date("2025-10-28T18:00:00Z"),
        venue: "City Art Gallery",
        totalTickets: 150,
        bookedTickets: 0,
        basePrice: "30.00",
        currentPrice: "30.00",
        priceFloor: "25.00",
        priceCeiling: "60.00",
        pricingRules: {
          timeBasedWeight: 0.4,
          demandBasedWeight: 0.3,
          inventoryBasedWeight: 0.3,
        },
      },
    ];

    // Insert events
    const insertedEvents = await db.insert(events).values(sampleEvents).returning();
    console.log(`Inserted ${insertedEvents.length} events`);

    // Sample bookings for the first event
    if (insertedEvents.length > 0) {
      const firstEvent = insertedEvents[0];
      if (!firstEvent) {
        throw new Error('Failed to retrieve first event');
      }

      const sampleBookings = [
        {
          eventId: firstEvent.id,
          userEmail: "alice@example.com",
          quantity: 2,
          pricePaid: "100.00",
          totalAmount: "200.00",
        },
        {
          eventId: firstEvent.id,
          userEmail: "bob@example.com",
          quantity: 1,
          pricePaid: "100.00",
          totalAmount: "100.00",
        },
      ];

      const insertedBookings = await db.insert(bookings).values(sampleBookings).returning();
      console.log(`Inserted ${insertedBookings.length} sample bookings`);

      return res.status(200).json({
        success: true,
        message: 'Database seeded successfully',
        data: {
          eventsCreated: insertedEvents.length,
          bookingsCreated: insertedBookings.length,
          events: insertedEvents.map((e: Event) => ({
            id: e.id,
            name: e.name,
            totalTickets: e.totalTickets,
            basePrice: e.basePrice,
          })),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Database seeded successfully (events only)',
      data: {
        eventsCreated: insertedEvents.length,
        bookingsCreated: 0,
        events: insertedEvents.map((e: Event) => ({
          id: e.id,
          name: e.name,
          totalTickets: e.totalTickets,
          basePrice: e.basePrice,
        })),
      },
    });

  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed database',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
