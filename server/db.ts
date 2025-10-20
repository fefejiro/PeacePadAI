import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with connection retry settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle({ client: pool, schema });

// Health check function with retry logic
async function checkDatabaseConnection(retries = 3, delay = 1000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('[Database] Connection successful');
      return true;
    } catch (error: any) {
      const isLastRetry = i === retries - 1;
      
      if (error.message?.includes('disabled') || error.message?.includes('suspended')) {
        console.warn(`[Database] Endpoint is suspended (attempt ${i + 1}/${retries}). This is normal - Neon auto-suspends after 5min inactivity.`);
      } else {
        console.warn(`[Database] Connection attempt ${i + 1}/${retries} failed:`, error.message);
      }
      
      if (!isLastRetry) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  console.warn('[Database] Failed to connect after retries. App will continue but database features may be limited.');
  console.warn('[Database] The database will auto-wake on first query attempt.');
  return false;
}

// Initialize connection check (non-blocking)
checkDatabaseConnection().catch(err => {
  console.error('[Database] Health check error:', err);
});

// Add error handler for pool
pool.on('error', (err) => {
  console.error('[Database] Unexpected pool error:', err);
  // Don't crash the app - just log the error
});

// Export a wrapper for queries that auto-retries on wake-up failures
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error: any) {
      const isLastRetry = i === maxRetries - 1;
      
      if (error.message?.includes('disabled') || error.message?.includes('suspended')) {
        if (!isLastRetry) {
          console.log(`[Database] Waking suspended endpoint (attempt ${i + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw new Error('Query failed after retries');
}
