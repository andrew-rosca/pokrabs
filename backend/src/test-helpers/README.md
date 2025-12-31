# Test Database Helpers

This module provides utilities for creating isolated test databases. Each test file gets its own unique database, ensuring complete isolation between tests.

## Usage

### Basic Pattern

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase } from '../test-helpers/database';
import { PrismaClient } from '@prisma/client';

describe('MyRepository', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeEach(async () => {
    // Create a fresh isolated database for this test file
    const { prisma: client, databaseUrl: url } = await setupTestDatabase();
    prisma = client;
    databaseUrl = url;
  });

  afterAll(async () => {
    // Clean up the database
    await cleanupTestDatabase(prisma, databaseUrl);
  });

  it('should do something', async () => {
    // Your test code here
    // This database is completely isolated from other test files
  });
});
```

### Alternative: Per-Test Database

If you need a fresh database for each test (slower but more isolated):

```typescript
import { createTestDatabase, cleanupTestDatabase } from '../test-helpers/database';

it('should do something', async () => {
  const { prisma, databaseUrl } = createTestDatabase();
  try {
    // Your test code
  } finally {
    await cleanupTestDatabase(prisma, databaseUrl);
  }
});
```

## Benefits

- **Complete Isolation**: Each test file has its own database
- **No Shared State**: Tests can't interfere with each other
- **Automatic Cleanup**: Database files are removed after tests
- **Fast**: File-based databases are fast for testing
- **Reliable**: No race conditions or shared state issues

## How It Works

1. Each test file calls `setupTestDatabase()` which creates a unique database file
2. The database file has a unique name based on timestamp and random ID
3. Prisma schema is automatically pushed to the new database
4. After tests complete, `cleanupTestDatabase()` removes the database file

