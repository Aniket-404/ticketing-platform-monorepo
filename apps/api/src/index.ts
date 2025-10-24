import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import seedRouter from './routes/seed';
import eventsRouter from './routes/events';
import bookingsRouter from './routes/bookings';
import analyticsRouter from './routes/analytics';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'API server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    message: 'Ticketing Platform API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      events: {
        list: 'GET /api/events',
        getById: 'GET /api/events/:id',
        create: 'POST /api/events (requires API key)',
      },
      bookings: {
        list: 'GET /api/bookings',
        getById: 'GET /api/bookings/:id',
        create: 'POST /api/bookings',
      },
      analytics: {
        eventStats: 'GET /api/analytics/events/:id',
        summary: 'GET /api/analytics/summary',
      },
      seed: 'POST /api/seed',
    }
  });
});

// API routes
app.use('/api/seed', seedRouter);
app.use('/api/events', eventsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/analytics', analyticsRouter);

// Remove placeholder routes
// (Events, bookings, and analytics are now handled by dedicated routers)

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
