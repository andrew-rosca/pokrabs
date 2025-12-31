import { defineConfig } from 'vitest/config';
import path from 'path';

// Set environment variables before tests run
// Use absolute path for the test database
process.env.DATABASE_URL = `file:${path.join(__dirname, 'prisma/data/test.db')}`;
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
  },
});

