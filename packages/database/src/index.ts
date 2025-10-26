import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// Load environment variables from .env file
config();

// Load environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Ensure the connection string is a string (not Buffer or undefined)
const connectionString = String(databaseUrl).trim();

if (!connectionString || connectionString === 'undefined') {
  throw new Error("DATABASE_URL is invalid or empty");
}

// Create PostgreSQL connection with pooling
// For migrations and schema introspection
const migrationClient = postgres(connectionString, { max: 1 });

// For query purposes - with connection pooling
const queryClient = postgres(connectionString, {
  max: 10, // Maximum pool size
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
});

// Create Drizzle instances
export const db = drizzle(queryClient, { schema });
export const migrationDb = drizzle(migrationClient, { schema });

// Export schema for use in other packages
export * from "./schema.js";

// Export types
export type Database = typeof db;

/**
 * Test database connection
 * @returns Promise that resolves when connection is successful
 * @throws Error if connection fails
 */
export async function testConnection(): Promise<void> {
  try {
    await queryClient`SELECT 1`;
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

/**
 * Close all database connections
 * Useful for graceful shutdown
 */
export async function closeConnections(): Promise<void> {
  await Promise.all([
    queryClient.end({ timeout: 5 }),
    migrationClient.end({ timeout: 5 }),
  ]);
  console.log("Database connections closed");
}
