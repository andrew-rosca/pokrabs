/**
 * Prisma Client Singleton
 * 
 * Provides a database-agnostic client that works with SQLite, PostgreSQL, MySQL, etc.
 * The client is generated from the Prisma schema and adapts to the database type
 * specified in the DATABASE_URL.
 */

import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

/**
 * Get or create Prisma client instance
 * In test mode, creates a new client for each test to ensure isolation
 * 
 * Note: Prisma reads DATABASE_URL from environment variables automatically
 */
export function getPrismaClient(): PrismaClient {
  const isTestMode = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';

  // In test mode, always create a new client for test isolation
  if (isTestMode) {
    return new PrismaClient({
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  // In production/dev, use singleton pattern
  if (!prismaClient) {
    prismaClient = new PrismaClient({
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

