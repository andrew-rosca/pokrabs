// Database setup script
// Initializes the database and runs migrations

import { getDatabaseClient } from './client';
import { runMigrations } from './migrate';

console.log('Setting up database...');

try {
  // Get database client (this will create the database file if it doesn't exist)
  const db = getDatabaseClient();
  console.log('Database connection established.');

  // Run migrations
  runMigrations();

  console.log('Database setup completed successfully.');
} catch (error) {
  console.error('Database setup failed:', error);
  process.exit(1);
}
