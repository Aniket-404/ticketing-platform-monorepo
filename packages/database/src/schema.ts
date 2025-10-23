import { pgTable, text, integer, timestamp, numeric, jsonb, uuid, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Events Table
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  venue: text("venue").notNull(),
  
  // Capacity
  totalTickets: integer("total_tickets").notNull(),
  bookedTickets: integer("booked_tickets").notNull().default(0),
  
  // Pricing
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull(),
  priceFloor: numeric("price_floor", { precision: 10, scale: 2 }).notNull(),
  priceCeiling: numeric("price_ceiling", { precision: 10, scale: 2 }).notNull(),
  
  // Pricing Rules Configuration (stored as JSON)
  pricingRules: jsonb("pricing_rules").notNull().$type<{
    timeBasedWeight: number;
    demandBasedWeight: number;
    inventoryBasedWeight: number;
  }>(),
  
  // Metadata
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

// Bookings Table
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  
  // User Information
  userEmail: text("user_email").notNull(),
  
  // Booking Details
  quantity: integer("quantity").notNull(),
  pricePaid: numeric("price_paid", { precision: 10, scale: 2 }).notNull(), // Snapshot at booking time
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(), // pricePaid * quantity
  
  // Metadata
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const eventsRelations = relations(events, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  event: one(events, {
    fields: [bookings.eventId],
    references: [events.id],
  }),
}));

// Type exports for use in other packages
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
