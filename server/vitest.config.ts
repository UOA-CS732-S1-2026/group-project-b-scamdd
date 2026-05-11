import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    globalSetup: ['./src/__tests__/globalSetup.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
