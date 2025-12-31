// Database client singleton with dynamic configuration
// Follows the pattern: lazy creation, connection string checking, client recreation

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbClient: Database.Database | null = null;
let currentConnectionString: string | null = null;

/**
 * Get the database connection string from environment variables
 */
function getConnectionString(): string {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  const dbUrl = process.env.DATABASE_URL || './data/pokrabs.db';

  if (dbType === 'sqlite') {
    // Resolve relative paths to absolute
    const absolutePath = path.isAbsolute(dbUrl) ? dbUrl : path.resolve(process.cwd(), dbUrl);
    
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    return absolutePath;
  }

  // For future database types (PostgreSQL, MySQL), return connection string as-is
  return dbUrl;
}

/**
 * Get or create database client instance
 * Checks connection string and recreates client if it changed
 */
export function getDatabaseClient(): Database.Database {
  const connectionString = getConnectionString();
  const isTestMode = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';
  const dbType = process.env.DATABASE_TYPE || 'sqlite';

  // In test mode, always check connection string (more aggressive)
  // In production/dev, use caching for performance
  if (isTestMode || connectionString !== currentConnectionString) {
    // Disconnect old client if connection string changed
    if (dbClient && connectionString !== currentConnectionString) {
      try {
        dbClient.close();
      } catch (error) {
        // Ignore errors when closing old client
        console.warn('Error closing old database client:', error);
      }
      dbClient = null;
    }

    // Create new client
    if (dbType === 'sqlite') {
      dbClient = new Database(connectionString);
      // Enable WAL mode for better concurrency (allows multiple readers)
      dbClient.pragma('journal_mode = WAL');
      // Enable foreign keys
      dbClient.pragma('foreign_keys = ON');
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }

    currentConnectionString = connectionString;
  }

  if (!dbClient) {
    throw new Error('Failed to create database client');
  }

  return dbClient;
}

/**
 * Close database connection
 * Useful for cleanup in tests
 */
export function closeDatabase(): void {
  if (dbClient) {
    try {
      dbClient.close();
    } catch (error) {
      console.warn('Error closing database:', error);
    }
    dbClient = null;
    currentConnectionString = null;
  }
}

