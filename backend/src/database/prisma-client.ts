/**
 * Prisma Client Singleton
 * 
 * Provides a database-agnostic client that works with SQLite, PostgreSQL, MySQL, etc.
 * The client is generated from the Prisma schema and adapts to the database type
 * specified in the DATABASE_URL environment variable.
 */

import { PrismaClient } from '@prisma/client';

// Export the PrismaClient type for use in other modules
export type PrismaClientType = PrismaClient;

// Transaction client type (subset of PrismaClient used in transactions)
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

let prismaClient: PrismaClient | null = null;

/**
 * Get database URL based on environment
 * Exported for use in migrations and other setup code
 */
export function getDatabaseUrl(): string {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  let databaseUrl = process.env.DATABASE_URL;
  
  // If no DATABASE_URL is set, use defaults
  if (!databaseUrl) {
    // In test mode, use in-memory database
    const isTestMode = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';
    if (isTestMode) {
      return 'file::memory:';
    }
    
    // Default to file-based database
    databaseUrl = './data/pokrabs.db';
  }
  
  // For SQLite, ensure the URL has the file: protocol
  if (dbType === 'sqlite') {
    // If it's already a file: URL, return as-is
    if (databaseUrl.startsWith('file:')) {
      return databaseUrl;
    }
    
    // Convert relative or absolute paths to file: URL
    const path = require('path');
    const fs = require('fs');
    
    // Resolve to absolute path
    const absolutePath = path.isAbsolute(databaseUrl) 
      ? databaseUrl 
      : path.resolve(process.cwd(), databaseUrl);
    
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Return as file: URL
    return `file:${absolutePath}`;
  }
  
  // For other database types, return as-is
  return databaseUrl;
}

/**
 * Get or create Prisma client instance
 * In test mode, creates a new client for each test to ensure isolation
 */
export function getPrismaClient(): PrismaClient {
  const isTestMode = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';
  const databaseUrl = getDatabaseUrl();

  // In test mode, always create a new client for test isolation
  if (isTestMode) {
    return new PrismaClient({
      datasourceUrl: databaseUrl,
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  // In production/dev, use singleton pattern
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      datasourceUrl: databaseUrl,
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  return prismaClient;
}

/**
 * Disconnect Prisma client
 * Useful for cleanup in tests
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}
