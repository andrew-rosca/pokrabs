// Test for migration system
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDatabaseClient, closeDatabase } from './client';
import { runMigrations } from './migrate';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Migration System', () => {
  let testDbPath: string;

  beforeAll(() => {
    // Create a temporary database for testing
    testDbPath = path.join(os.tmpdir(), `pokrabs-test-${Date.now()}-${Math.random().toString(36).substring(7)}.db`);
    process.env.DATABASE_URL = testDbPath;
    process.env.TEST_MODE = 'true';
  });

  afterAll(() => {
    // Clean up test database
    closeDatabase();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    delete process.env.DATABASE_URL;
    delete process.env.TEST_MODE;
  });

  it('should run migrations successfully', () => {
    // Close any existing connection first to ensure clean state
    closeDatabase();
    expect(() => runMigrations()).not.toThrow();
  });

  it('should create schema_migrations table', () => {
    const db = getDatabaseClient();
    const tableInfo = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='schema_migrations'
    `).get();
    
    expect(tableInfo).toBeDefined();
  });

  it('should track applied migrations', () => {
    const db = getDatabaseClient();
    const migrations = db.prepare(`
      SELECT version FROM schema_migrations ORDER BY version
    `).all() as Array<{ version: string }>;
    
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0].version).toBe('001');
  });

  it('should not re-run already applied migrations', () => {
    // Run migrations again - should not fail and should not duplicate
    // Note: This should show "No pending migrations" since 001 was already applied
    expect(() => runMigrations()).not.toThrow();
    
    const db = getDatabaseClient();
    const migrations = db.prepare(`
      SELECT version FROM schema_migrations ORDER BY version
    `).all() as Array<{ version: string }>;
    
    // Should still only have one migration (001)
    const versions = migrations.map(m => m.version);
    expect(versions.filter(v => v === '001').length).toBe(1);
  });

  it('should create tables from migrations', () => {
    const db = getDatabaseClient();
    const tableInfo = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='test_migration'
    `).get();
    
    expect(tableInfo).toBeDefined();
  });
});

