/**
 * Test Setup
 * 
 * This file is run before all tests to set up the test environment.
 * It ensures the test database exists and has the correct schema.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Ensure the test database directory exists
const dbDir = path.join(__dirname, '../prisma/data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Push the schema to the test database
// This creates the tables if they don't exist
try {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    env: {
      ...process.env,
      DATABASE_URL: `file:${path.join(dbDir, 'test.db')}`,
    },
  });
  console.log('Test database schema pushed successfully');
} catch (error) {
  console.error('Failed to push test database schema:', error);
  throw error;
}

