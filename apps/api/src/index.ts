import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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
      health: '/health',
      events: '/api/events',
      bookings: '/api/bookings',
      analytics: '/api/analytics'
    }
  });
});

// Placeholder API routes
app.get('/api/events', (_req: Request, res: Response) => {
  res.json({ message: 'Events endpoint - to be implemented' });
});

app.get('/api/bookings', (_req: Request, res: Response) => {
  res.json({ message: 'Bookings endpoint - to be implemented' });
});

app.get('/api/analytics', (_req: Request, res: Response) => {
  res.json({ message: 'Analytics endpoint - to be implemented' });
});

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
