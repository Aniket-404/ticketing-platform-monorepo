# Event Ticketing Platform

A full-stack event ticketing platform with dynamic pricing that adjusts ticket prices based on demand, time to event, and inventory levels.

## Prerequisites

Before running this project, make sure you have:

- **Node.js** (version 18 or higher)
- **pnpm** (version 9.0.0 or higher)
- **Docker** and **Docker Compose** (for running PostgreSQL)
- **Git**

## Installation

Get the project up and running in just 4 simple commands:

```bash
# 1. Clone and install dependencies
git clone <your-repo-url>
cd ticketing-platform-monorepo
pnpm install

# 2. Set up environment variables
cp .env.example .env

# 3. Start PostgreSQL database
docker-compose up -d

# 4. Run database migrations and seed data
pnpm --filter @repo/database db:migrate
pnpm --filter @repo/database db:seed
```

That's it! You're ready to run the application.

## Running the Application

Start both the frontend and backend servers:

```bash
pnpm dev
```

The application will be available at:
- **Frontend (Next.js)**: http://localhost:3000
- **Backend API (Express)**: http://localhost:4000

To stop the servers, press `Ctrl+C` in the terminal.

## Running Tests

Run all tests across the monorepo:

```bash
pnpm test
```

Run tests with coverage:

```bash
# Backend API tests with coverage
pnpm --filter api test:coverage

# Frontend tests with coverage
pnpm --filter web test:coverage
```

Run tests in watch mode during development:

```bash
pnpm --filter api test:watch
```

## Environment Variables

The project uses the following environment variables (defined in `.env` file):

### Database Configuration
- `POSTGRES_USER` - PostgreSQL username (default: `ticketing_user`)
- `POSTGRES_PASSWORD` - PostgreSQL password (default: `ticketing_password`)
- `POSTGRES_DB` - Database name (default: `ticketing_platform`)
- `POSTGRES_PORT` - PostgreSQL port (default: `5432`)
- `DATABASE_URL` - Full database connection string

### Application Configuration
- `NODE_ENV` - Environment mode (`development` or `production`)
- `PORT` - Backend API port (default: `4000`)

### Pricing Configuration (Optional)
- `PRICING_WEIGHT_DEMAND` - Weight for demand-based pricing (default: `0.3`)
- `PRICING_WEIGHT_TIME` - Weight for time-based pricing (default: `0.2`)
- `PRICING_WEIGHT_INVENTORY` - Weight for inventory-based pricing (default: `0.5`)

All required environment variables have sensible defaults in the `.env.example` file.

## Project Structure

This is a monorepo managed by Turborepo with the following structure:

```
ticketing-platform-monorepo/
├── apps/
│   ├── api/          # Express backend API
│   └── web/          # Next.js frontend
├── packages/
│   ├── database/     # Drizzle ORM & database schema
│   ├── eslint-config/# Shared ESLint configs
│   ├── typescript-config/# Shared TypeScript configs
│   └── ui/           # Shared UI components
└── docker-compose.yml # PostgreSQL setup
```

## API Endpoints

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create a new event

### Bookings
- `POST /api/bookings` - Create a booking
- `GET /api/bookings?userEmail=xxx` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details

### Analytics
- `GET /api/analytics/events/:id` - Get event analytics
- `GET /api/analytics/summary` - Get system-wide analytics

### Development
- `POST /api/seed` - Seed database with sample events

## Database Management

**Start the database:**
```bash
docker-compose up -d
```

**Stop the database:**
```bash
docker-compose down
```

**Reset the database (removes all data):**
```bash
docker-compose down -v
docker-compose up -d
pnpm --filter @repo/database db:migrate
pnpm --filter @repo/database db:seed
```

**View database logs:**
```bash
docker-compose logs -f postgres
```

**Connect to PostgreSQL CLI:**
```bash
docker exec -it ticketing-platform-db psql -U ticketing_user -d ticketing_platform
```

## Troubleshooting

**Port already in use:**
```bash
# Kill processes on specific ports
pnpm kill:ports
```

**Database connection issues:**
- Make sure Docker is running
- Check if PostgreSQL container is up: `docker-compose ps`
- Verify DATABASE_URL in .env matches your setup

**Tests failing:**
- Ensure database is running and seeded
- Run `pnpm install` to ensure all dependencies are installed
- Clear test caches: `pnpm --filter api test --clearCache`

## Features Implemented

✅ Dynamic pricing based on demand, time, and inventory  
✅ Concurrency control with database transactions  
✅ Real-time price updates  
✅ Booking management  
✅ Event analytics  
✅ Comprehensive test coverage  
✅ Monorepo architecture with shared packages

````
