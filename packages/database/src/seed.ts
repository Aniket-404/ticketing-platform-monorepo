import { db } from "./index";
import { events } from "./schema";

async function seed() {
  console.log("Seeding database...");

  try {
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

    console.log(`Successfully seeded ${insertedEvents.length} events`);
    console.log("\nSeeded Events:");
    insertedEvents.forEach((event) => {
      console.log(`  - ${event.name} (${event.totalTickets} tickets at $${event.basePrice})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
