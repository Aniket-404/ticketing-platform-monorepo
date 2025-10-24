import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate API key authentication
 * Checks for API key in Authorization header
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    res.status(500).json({ 
      error: 'Server configuration error',
      message: 'API key not configured on server'
    });
    return;
  }

  if (!apiKey) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'API key required. Provide in Authorization header as: Bearer YOUR_API_KEY'
    });
    return;
  }

  if (apiKey !== validApiKey) {
    res.status(403).json({ 
      error: 'Forbidden',
      message: 'Invalid API key'
    });
    return;
  }

  next();
}
