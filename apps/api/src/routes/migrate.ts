import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const router: Router = Router();

/**
 * POST /api/migrate
 * Run database migrations (one-time setup endpoint)
 * This endpoint should only be called once after deployment
 */
router.post('/', async (_req: Request, res: Response) => {
  try {
    console.log('🔄 Starting database migrations...');
    
    // Navigate to database package and run migrations
    const databasePath = path.join(process.cwd(), '..', '..', 'packages', 'database');
    
    try {
      // Run migrations
      const { stdout: migrateOut, stderr: migrateErr } = await execAsync(
        'pnpm db:migrate',
        { cwd: databasePath }
      );
      
      console.log('Migration output:', migrateOut);
      if (migrateErr) console.log('Migration stderr:', migrateErr);
      
      // Run seeding
      const { stdout: seedOut, stderr: seedErr } = await execAsync(
        'pnpm db:seed',
        { cwd: databasePath }
      );
      
      console.log('Seed output:', seedOut);
      if (seedErr) console.log('Seed stderr:', seedErr);
      
      res.json({
        success: true,
        message: 'Database migrations and seeding completed successfully',
        output: {
          migrate: migrateOut,
          seed: seedOut,
        },
      });
    } catch (execError: any) {
      console.error('Execution error:', execError);
      throw new Error(`Migration/Seed failed: ${execError.message}`);
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run migrations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
