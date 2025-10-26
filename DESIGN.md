# Design Document

## Pricing Algorithm Implementation

The dynamic pricing engine is built around a weighted factor model that combines three core components: demand, time, and inventory. I chose this approach because it's both flexible and transparent - each factor can be tuned independently through environment variables without touching code.

The algorithm uses a simple formula: `price = basePrice × (1 + w1×demand + w2×time + w3×inventory)`, where w1, w2, and w3 are configurable weights. Each factor is normalized to a 0-1 range (except time which uses -1 to 1 to allow price drops far from the event). This normalization makes the weights meaningful - a weight of 0.5 means that factor can contribute up to 50% price increase.

I implemented separate calculation functions for each factor to keep the code testable and maintainable. The demand factor looks at recent booking velocity, time factor uses linear interpolation based on days until event, and inventory factor measures ticket scarcity. Each function validates its inputs and throws clear errors, which helped a lot during testing.

One design choice I'm happy with is making the algorithm deterministic and stateless - given the same inputs, it always produces the same output. This makes it easy to test and debug. I added floor and ceiling constraints in the event schema itself rather than in the algorithm, keeping business rules separate from calculation logic.

## Concurrency Solution

The concurrency problem was probably the trickiest part. I used PostgreSQL row-level locking with the `FOR UPDATE` clause inside database transactions. When a booking request comes in, the transaction locks that specific event row, checks availability, creates the booking, and updates the booked ticket count - all atomically.

The key insight was that PostgreSQL's transaction isolation ensures that when multiple requests try to book the last ticket, they queue up automatically. The first transaction gets the lock, books the ticket, and commits. The second transaction then gets the lock but sees the updated booked_tickets count and fails with an "insufficient tickets" error.

I wrote an integration test that fires two simultaneous booking requests for the last ticket using Promise.all. The test consistently shows exactly one success and one failure, proving the locking works. During development, I initially tried optimistic locking with version numbers, but it was more complex and didn't guarantee ACID properties as cleanly as row-level locks.

## Monorepo Architecture

I went with Turborepo because it was already set up and honestly, it just works. The monorepo structure lets me share the database schema and types between frontend and backend without publishing packages or copying code. The `@repo/database` package exports everything the API and web app need.

The architecture has three apps (API and web) and four shared packages (database, UI components, ESLint configs, and TypeScript configs). I kept the API as a simple Express server rather than using NestJS because the requirements didn't need dependency injection or decorators - Express gave me faster development with less boilerplate.

One thing I really like is how Turborepo handles the dependency graph. When I run `pnpm dev`, it knows to build the database package first before starting the API, which depends on it. The caching also helps - rebuilding after small changes is almost instant.

## Trade-offs and Improvements

The biggest trade-off was simplicity over features. I skipped implementing a proper job queue for price updates - instead, prices are calculated on-demand when events are fetched. This works fine for the assignment scope but would need optimization for production with thousands of events. A cron job that recalculates prices every few minutes and caches them in Redis would be better.

I also made the demand factor pretty basic - it just counts recent bookings in a time window. A more sophisticated approach would track booking velocity trends, account for event popularity, or even use ML to predict demand patterns. But that felt like over-engineering for a 7-day assignment.

The frontend is functional but minimal. Real-time price updates use simple polling every 30 seconds, which isn't super efficient. WebSockets would give instant updates and reduce server load, but I prioritized getting the core booking flow and concurrency handling rock-solid first.

If I had more time, I'd add proper error boundaries in the React app, implement request rate limiting on the API, add database indexes for common queries (especially on event date and booked tickets), and write more edge case tests. I'd also add a proper CI/CD pipeline with GitHub Actions to run tests automatically on every push.

Overall though, I'm pretty satisfied with how the core requirements came together - the pricing algorithm is flexible and well-tested, the concurrency handling is bulletproof, and the monorepo setup makes everything easy to work with.
