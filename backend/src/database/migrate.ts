// Database migration runner
// Tracks migration versions and runs pending migrations

import { getDatabaseClient } from './client';
import fs from 'fs';
import path from 'path';

// Find migrations directory - could be in backend/migrations or migrations
const findMigrationsDir = (): string => {
  const possiblePaths = [
    path.join(process.cwd(), 'migrations'), // If running from backend/
    path.join(process.cwd(), 'backend', 'migrations'), // If running from project root
  ];
  
  for (const dirPath of possiblePaths) {
    if (fs.existsSync(dirPath)) {
      return dirPath;
    }
  }
  
  // Default to backend/migrations relative to process.cwd()
  return path.join(process.cwd(), 'migrations');
};

const MIGRATIONS_DIR = findMigrationsDir();
const MIGRATIONS_TABLE = 'schema_migrations';

interface Migration {
  version: string;
  filename: string;
  up: string;
  down?: string;
}

/**
 * Initialize migrations table if it doesn't exist
 */
function initializeMigrationsTable(): void {
  const db = getDatabaseClient();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get all applied migration versions
 */
function getAppliedMigrations(): string[] {
  const db = getDatabaseClient();
  
  const rows = db.prepare(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`).all() as Array<{ version: string }>;
  return rows.map(row => row.version);
}

/**
 * Load migration files from migrations directory
 */
function loadMigrations(): Migration[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort alphabetically to ensure order

  return files.map(filename => {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract version from filename (e.g., "001_initial.sql" -> "001")
    const version = filename.replace(/^(\d+).*\.sql$/, '$1');
    
    // Split content into up and down migrations (separated by -- DOWN)
    const parts = content.split(/^--\s*DOWN\s*$/m);
    const up = parts[0].trim();
    const down = parts[1]?.trim();

    return {
      version,
      filename,
      up,
      down,
    };
  });
}

/**
 * Mark migration as applied
 */
function markMigrationApplied(db: ReturnType<typeof getDatabaseClient>, version: string): void {
  db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (version) VALUES (?)`).run(version);
}

/**
 * Run all pending migrations
 */
export function runMigrations(): void {
  console.log('Running database migrations...');
  
  initializeMigrationsTable();
  
  const applied = getAppliedMigrations();
  const migrations = loadMigrations();
  
  const pending = migrations.filter(m => !applied.includes(m.version));
  
  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  console.log(`Found ${pending.length} pending migration(s)`);

  const db = getDatabaseClient();
  
  // Run migrations in a transaction
  const transaction = db.transaction(() => {
    for (const migration of pending) {
      console.log(`Running migration: ${migration.filename}`);
      
      try {
        // Execute migration SQL
        db.exec(migration.up);
        
        // Mark as applied (pass db instance to avoid re-fetching)
        markMigrationApplied(db, migration.version);
        
        console.log(`✓ Applied migration: ${migration.version}`);
      } catch (error) {
        console.error(`✗ Failed to apply migration ${migration.version}:`, error);
        throw error;
      }
    }
  });

  transaction();
  
  console.log('All migrations completed successfully.');
}

/**
 * Rollback last migration (if down migration exists)
 */
export function rollbackLastMigration(): void {
  console.log('Rolling back last migration...');
  
  initializeMigrationsTable();
  
  const applied = getAppliedMigrations();
  const migrations = loadMigrations();
  
  if (applied.length === 0) {
    console.log('No migrations to rollback.');
    return;
  }

  const lastVersion = applied[applied.length - 1];
  const migration = migrations.find(m => m.version === lastVersion);

  if (!migration || !migration.down) {
    console.log(`No down migration found for version ${lastVersion}`);
    return;
  }

  const db = getDatabaseClient();
  
  try {
    db.exec(migration.down);
    
    // Remove from applied migrations
    db.prepare(`DELETE FROM ${MIGRATIONS_TABLE} WHERE version = ?`).run(lastVersion);
    
    console.log(`✓ Rolled back migration: ${lastVersion}`);
  } catch (error) {
    console.error(`✗ Failed to rollback migration ${lastVersion}:`, error);
    throw error;
  }
}

// Run migrations if called directly (when executed via tsx)
// Check if this file is being run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('migrate.ts');
if (isMainModule) {
  runMigrations();
}
