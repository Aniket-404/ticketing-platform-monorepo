# Assignment Requirements

- Duration: 7 days from receipt
- Stack: Next.js 15, NestJS/ExpressJS, Turborepo, Drizzle ORM, PostgreSQL

**NOTE:** You are free to fork this repository, complete the assignment in your own fork, and **retain full ownership of your code**. Please just add me as a collaborator during the evaluation process so I can review your submission.

## What You're Building

A full-stack event ticketing platform with dynamic pricing. Ticket prices automatically adjust based on time until event, booking velocity, and remaining inventory.

## Technical Stack

**Required:**

- Monorepo: Turborepo (already configured)
- Frontend: Next.js 15 with App Router (starter provided)
- Backend: NestJS or Express (your choice)
- Database: PostgreSQL with Drizzle ORM
- Language: TypeScript strict mode

**Optional (bonus points):**

- Redis for caching
- Docker Compose for easy local setup

## Core Requirements

**1. Database Schema**

Design and implement schema for events and bookings.

**Event must include:**

- Basic info: name, date, venue, description
- Capacity: total tickets, booked tickets
- Pricing: base price, current price, floor, ceiling
- Pricing rules configuration (stored as JSON)

**Booking must include:**

- Reference to event
- User email
- Quantity
- Price paid (snapshot at booking time)
- Booking timestamp

The database package is set up with Drizzle. You need to:

- Create `src/schema.ts` with your table definitions
- Create `src/index.ts` to export the database client
- Create `src/seed.ts` to populate sample data

**2. Dynamic Pricing Engine**

This is the core challenge. Implement logic that calculates ticket price based on three rules:

**Time-Based Rule**

Price increases as event date approaches.

Example: Base price for events 30+ days out, +20% for events within 7 days, +50% for events tomorrow.

**Demand-Based Rule**

Price increases when booking velocity is high.

Example: If more than 10 bookings happened in the last hour, increase price by 15%.

**Inventory-Based Rule**

Price increases as tickets sell out.

Example: When less than 20% of tickets remain, increase price by 25%.

**Implementation requirements:**

- Each rule has a configurable weight (via environment variables)
- Rules combine to produce final price
- Price must respect floor (minimum) and ceiling (maximum)
- Price calculation must be deterministic and testable
- Formula: currentPrice = basePrice × (1 + sum of weighted adjustments)

**3. API Endpoints**

Build a REST API with these endpoints:

**Events**

- `GET /events` - List all events with current price and availability
- `GET /events/:id` - Get single event details with price breakdown
- `POST /events` - Create new event (simple auth is fine)

**Bookings**

- `POST /bookings` - Book tickets (body: eventId, userEmail, quantity)
- `GET /bookings?eventId=:id` - List bookings for an event

**Analytics**

- `GET /analytics/events/:id` - Get metrics for an event (total sold, revenue, average price, remaining)
- `GET /analytics/summary` - System-wide metrics

**Development**

- `POST /seed` - Seed database with sample events

**4. Concurrency Control**

**Critical requirement:** Prevent overselling when multiple users book simultaneously.
When only 1 ticket remains and 2 users try to book at the same time:

- Only 1 booking should succeed
- The other should receive a clear error
- No tickets should be oversold

You must:

- Implement proper transaction handling with row-level locking
- Write an automated test that proves this works

Example test structure:

```ts
typescriptdescribe("Concurrent Bookings", () => {
  it("prevents overbooking of last ticket", async () => {
    // Setup: Create event with 1 ticket remaining
    // Execute: Make 2 simultaneous booking requests
    // Assert: Exactly 1 succeeds, 1 fails with proper error
  });
});
```

**5. Frontend Pages**

Build these pages using Next.js App Router:

**Event List (`/events`)**

- Display all upcoming events
- Show name, date, venue, current price, tickets remaining
- Click event to view details

**Event Detail (`/events/[id]`)**

- Full event information
- Price breakdown showing base price and adjustments from each rule
- Booking form with quantity selector
- Real-time price updates (polling every 30 seconds is fine)

**Booking Confirmation (`/bookings/success`)**

- Show booking details after successful purchase
- Display price paid vs current price

**User Bookings (`/my-bookings`)**

- List user's bookings
- Show event name, tickets, price paid
- Compare price paid to current price

**Technical requirements:**

- Use Server Components where appropriate
- Handle form submission with Server Actions
- Show loading states and error messages
- Responsive design

**Testing Requirements**

**You must include:**

1. Unit tests for pricing calculation logic
   - Test each rule independently
   - Test combined rules
   - Test floor/ceiling constraints

2. Integration tests for booking flow

- Complete flow from price calculation to booking confirmation

3. Concurrency test (mandatory)

- Automated test proving your solution prevents overbooking

Minimum 70% coverage for pricing logic.

**Deliverables**

**1. GitHub Repository**

Include:

- All source code
- README.md with setup instructions
- DESIGN.md explaining your approach
- .env.example files
- Working seed script

**2. README.md**

Must contain:

- Prerequisites (Node version, database, etc)
- Installation steps (should work in under 5 commands)
- How to run the application
- How to run tests
- Environment variables documentation

**3. DESIGN.md**

Write 300-500 words explaining:

- Your pricing algorithm implementation and design choices
- How you solved the concurrency problem
- Monorepo architecture decisions
- Trade-offs you made
- What you would improve with more time

**4. Working Application**

We should be able to:

- Clone your repo
- Run setup commands
- Seed the database
- Access the working application
- Run your tests and see them pass

## What's NOT Required

To keep the scope reasonable for 7 days, you do **not** need to implement:

**Payment Processing**

- No Stripe/PayPal integration needed
- No actual payment gateway
- When a booking is created, just record the price - assume payment happened

**Authentication System**

- No user registration/login required
- For the booking flow, just ask for email address
- Simple admin authentication (hardcoded API key is fine) for creating events

**Email Notifications**

- No need to send booking confirmations
- No email service integration

**Advanced Features**

- No refunds or cancellation flow
- No QR codes or ticket PDFs
- No seat selection or ticket tiers

Focus on the core challenges: dynamic pricing algorithm and concurrency control. Everything else should be kept minimal.

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose (for PostgreSQL)
- Git

### Installation

1. Clone the repository and install dependencies:
```bash
git clone <your-repo-url>
cd ticketing-platform-monorepo
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env if you need to customize database credentials
```

3. Start PostgreSQL using Docker:
```bash
docker-compose up -d
```

4. Verify the database is running:
```bash
docker-compose ps
# The postgres container should show as "Up" with healthy status
```

5. Run database migrations (after completing database package setup):
```bash
pnpm --filter @repo/database db:migrate
```

6. Seed the database with sample data:
```bash
pnpm --filter @repo/database db:seed
```

7. Start the development servers:
```bash
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Database Management

**Start PostgreSQL:**
```bash
docker-compose up -d
```

**Stop PostgreSQL:**
```bash
docker-compose down
```

**Stop and remove all data:**
```bash
docker-compose down -v
```

**View PostgreSQL logs:**
```bash
docker-compose logs -f postgres
```

**Connect to PostgreSQL CLI:**
```bash
docker exec -it ticketing-platform-db psql -U ticketing_user -d ticketing_platform
```

### Environment Variables

Key environment variables (see `.env.example` for full list):

- `DATABASE_URL`: PostgreSQL connection string
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name
- `POSTGRES_PORT`: PostgreSQL port (default: 5432)
- `NODE_ENV`: Application environment (development/production)
- `PORT`: Backend API port (default: 4000)

````
