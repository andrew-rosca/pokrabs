/**
 * Test Database Helpers
 * 
 * Provides utilities for creating isolated test databases.
 * Each test file gets its own in-memory database for complete isolation.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

let testDbCounter = 0;

/**
 * Create a fresh isolated database for testing
 * 
 * Each call returns a new Prisma client with its own isolated database.
 * Uses a temporary file-based database that is unique per test file.
 * The database file should be cleaned up using cleanupTestDatabase().
 * 
 * @returns An object with the Prisma client and database URL
 */
export function createTestDatabase(): { prisma: PrismaClient; databaseUrl: string } {
  // Use a unique temporary database file for each test file
  // This ensures complete isolation between test files
  const uniqueId = `${Date.now()}_${++testDbCounter}_${Math.random().toString(36).substring(7)}`;
  const dbPath = path.join(__dirname, '../../prisma/data', `test_${uniqueId}.db`);
  const databaseUrl = `file:${dbPath}`;
  
  // Set DATABASE_URL so getPrismaClient() uses the correct database
  // This is important for utilities like id-generator that use getPrismaClient()
  process.env.DATABASE_URL = databaseUrl;
  
  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
  });

  // Push schema to the new database
  // This creates all tables including id_counter
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });
  } catch (error) {
    console.error('Failed to push schema to test database:', error);
    throw error;
  }

  return { prisma, databaseUrl };
}

/**
 * Setup a test database and return a Prisma client
 * 
 * This is a convenience function that creates a database and ensures
 * it's properly initialized with the schema.
 * 
 * @returns An object with the Prisma client and database URL for cleanup
 */
export async function setupTestDatabase(): Promise<{ prisma: PrismaClient; databaseUrl: string }> {
  const uniqueId = `${Date.now()}_${++testDbCounter}_${Math.random().toString(36).substring(7)}`;
  const dbPath = path.join(__dirname, '../../prisma/data', `test_${uniqueId}.db`);
  const databaseUrl = `file:${dbPath}`;
  
  // Set DATABASE_URL so getPrismaClient() uses the correct database
  // This is important for utilities like id-generator that use getPrismaClient()
  process.env.DATABASE_URL = databaseUrl;
  
  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
  });

  // Push schema to the new database
  // This creates all tables including id_counter
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });
  } catch (error) {
    console.error('Failed to push schema to test database:', error);
    throw error;
  }

  await prisma.$connect();
  
  return { prisma, databaseUrl };
}

/**
 * Cleanup a test database
 * 
 * Disconnects the Prisma client and removes the database file.
 * 
 * @param prisma - The Prisma client to disconnect
 * @param databaseUrl - Optional database URL to delete the file
 */
export async function cleanupTestDatabase(prisma: PrismaClient, databaseUrl?: string): Promise<void> {
  await prisma.$disconnect();
  
  // Clean up the database file if provided
  if (databaseUrl && databaseUrl.startsWith('file:')) {
    const dbPath = databaseUrl.replace('file:', '');
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      // Also remove -wal and -shm files if they exist
      if (fs.existsSync(`${dbPath}-wal`)) {
        fs.unlinkSync(`${dbPath}-wal`);
      }
      if (fs.existsSync(`${dbPath}-shm`)) {
        fs.unlinkSync(`${dbPath}-shm`);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

