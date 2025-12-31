-- Initial migration
-- This is a placeholder migration to test the migration system

-- Create a test table to verify migrations work
CREATE TABLE IF NOT EXISTS test_migration (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOWN
DROP TABLE IF EXISTS test_migration;

