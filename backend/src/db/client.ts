import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { env } from '../config/env.js';

// Connection options with resilience
const connectionString = env.DATABASE_URL;

// PostgreSQL Client
export const pgClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 5,
  onnotice: () => {}, // Suppress notice logs
});

// Drizzle ORM instance
export const db = drizzle(pgClient, { schema });

// State tracker
let isConnected = false;

/**
 * Health check to verify PostgreSQL connectivity.
 * Safe to call at startup or from health check endpoints.
 */
export async function checkDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const result = await pgClient`SELECT 1 as ping`;
    if (result && result.length > 0) {
      isConnected = true;
      return { connected: true };
    }
    return { connected: false, error: 'Empty ping response' };
  } catch (error: any) {
    isConnected = false;
    return {
      connected: false,
      error: error.message || 'Unable to connect to PostgreSQL database',
    };
  }
}

export function isDatabaseConnected(): boolean {
  return isConnected;
}

export { schema };
