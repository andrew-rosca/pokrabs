import { defineConfig } from 'vitest/config';

// Set test environment
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
    // Run tests sequentially to avoid any potential shared state issues
    // Each test file uses its own in-memory database, but this ensures
    // no interference from parallel execution
    pool: 'forks',
    fileParallelism: false, // Run tests sequentially (Vitest 4 migration)
  },
});

