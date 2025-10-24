import { Router, Request, Response } from 'express';
import { db, events, bookings } from '@repo/database';
import { eq, sql, sum, avg, count } from 'drizzle-orm';

const router: Router = Router();

/**
 * GET /api/analytics/events/:id
 * Get analytics for a specific event
 */
router.get('/events/:id', async (req: Request, res: Response) => {
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
    
    // Get event details
    const eventResult = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    
    if (eventResult.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
        message: `No event found with ID: ${id}`,
      });
      return;
    }
    
    const event = eventResult[0];
    if (!event) {
      res.status(404).json({
        success: false,
        error: 'Event not found',
      });
      return;
    }
    
    // Get booking analytics for this event
    const analyticsResult = await db
      .select({
        totalBookings: count(bookings.id),
        totalTicketsSold: sql<number>`COALESCE(SUM(${bookings.quantity})::integer, 0)`,
        totalRevenue: sql<string>`COALESCE(SUM(${bookings.totalAmount})::numeric, 0)`,
        averageTicketPrice: sql<string>`COALESCE(AVG(${bookings.pricePaid})::numeric, 0)`,
      })
      .from(bookings)
      .where(eq(bookings.eventId, id));
    
    const analytics = analyticsResult[0];
    
    if (!analytics) {
      res.status(500).json({
        success: false,
        error: 'Failed to calculate analytics',
      });
      return;
    }
    
    const availableTickets = event.totalTickets - event.bookedTickets;
    const soldOutPercentage = ((event.bookedTickets / event.totalTickets) * 100).toFixed(2);
    
    res.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
          venue: event.venue,
        },
        capacity: {
          totalTickets: event.totalTickets,
          ticketsSold: event.bookedTickets,
          availableTickets,
          soldOutPercentage: `${soldOutPercentage}%`,
        },
        bookings: {
          totalBookings: analytics.totalBookings,
          totalTicketsSold: analytics.totalTicketsSold,
        },
        revenue: {
          totalRevenue: parseFloat(analytics.totalRevenue).toFixed(2),
          averageTicketPrice: parseFloat(analytics.averageTicketPrice).toFixed(2),
          basePrice: event.basePrice,
          currentPrice: event.currentPrice,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/analytics/summary
 * Get system-wide analytics summary
 */
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    // Get total events count
    const eventsCountResult = await db
      .select({
        total: count(events.id),
        active: sql<number>`COUNT(CASE WHEN ${events.isActive} = true THEN 1 END)::integer`,
        inactive: sql<number>`COUNT(CASE WHEN ${events.isActive} = false THEN 1 END)::integer`,
      })
      .from(events);
    
    const eventsCount = eventsCountResult[0];
    
    // Get overall booking analytics
    const bookingAnalyticsResult = await db
      .select({
        totalBookings: count(bookings.id),
        totalTicketsSold: sql<number>`COALESCE(SUM(${bookings.quantity})::integer, 0)`,
        totalRevenue: sql<string>`COALESCE(SUM(${bookings.totalAmount})::numeric, 0)`,
        averageTicketPrice: sql<string>`COALESCE(AVG(${bookings.pricePaid})::numeric, 0)`,
        averageBookingSize: sql<string>`COALESCE(AVG(${bookings.quantity})::numeric, 0)`,
      })
      .from(bookings);
    
    const bookingAnalytics = bookingAnalyticsResult[0];
    
    // Get capacity analytics
    const capacityResult = await db
      .select({
        totalCapacity: sql<number>`COALESCE(SUM(${events.totalTickets})::integer, 0)`,
        totalBooked: sql<number>`COALESCE(SUM(${events.bookedTickets})::integer, 0)`,
      })
      .from(events)
      .where(eq(events.isActive, true));
    
    const capacity = capacityResult[0];
    
    // Get top events by revenue
    const topEventsByRevenueResult = await db
      .select({
        eventId: bookings.eventId,
        eventName: events.name,
        totalRevenue: sql<string>`SUM(${bookings.totalAmount})::numeric`,
        ticketsSold: sql<number>`SUM(${bookings.quantity})::integer`,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .groupBy(bookings.eventId, events.name)
      .orderBy(sql`SUM(${bookings.totalAmount}) DESC`)
      .limit(5);
    
    // Get top events by tickets sold
    const topEventsByTicketsResult = await db
      .select({
        eventId: bookings.eventId,
        eventName: events.name,
        ticketsSold: sql<number>`SUM(${bookings.quantity})::integer`,
        totalRevenue: sql<string>`SUM(${bookings.totalAmount})::numeric`,
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .groupBy(bookings.eventId, events.name)
      .orderBy(sql`SUM(${bookings.quantity}) DESC`)
      .limit(5);
    
    if (!eventsCount || !bookingAnalytics || !capacity) {
      res.status(500).json({
        success: false,
        error: 'Failed to calculate summary analytics',
      });
      return;
    }
    
    const totalCapacity = capacity.totalCapacity || 0;
    const totalBooked = capacity.totalBooked || 0;
    const availableCapacity = totalCapacity - totalBooked;
    const overallUtilization = totalCapacity > 0 
      ? ((totalBooked / totalCapacity) * 100).toFixed(2)
      : '0.00';
    
    res.json({
      success: true,
      data: {
        events: {
          total: eventsCount.total,
          active: eventsCount.active,
          inactive: eventsCount.inactive,
        },
        capacity: {
          totalCapacity,
          totalBooked,
          availableCapacity,
          overallUtilization: `${overallUtilization}%`,
        },
        bookings: {
          totalBookings: bookingAnalytics.totalBookings,
          totalTicketsSold: bookingAnalytics.totalTicketsSold,
          averageBookingSize: parseFloat(bookingAnalytics.averageBookingSize).toFixed(2),
        },
        revenue: {
          totalRevenue: parseFloat(bookingAnalytics.totalRevenue).toFixed(2),
          averageTicketPrice: parseFloat(bookingAnalytics.averageTicketPrice).toFixed(2),
        },
        topEvents: {
          byRevenue: topEventsByRevenueResult.map(e => ({
            eventId: e.eventId,
            eventName: e.eventName,
            totalRevenue: parseFloat(e.totalRevenue).toFixed(2),
            ticketsSold: e.ticketsSold,
          })),
          byTicketsSold: topEventsByTicketsResult.map(e => ({
            eventId: e.eventId,
            eventName: e.eventName,
            ticketsSold: e.ticketsSold,
            totalRevenue: parseFloat(e.totalRevenue).toFixed(2),
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching summary analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
