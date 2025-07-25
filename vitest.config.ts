import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.ts'],
      coverage: {
        reporter: ['text', 'json', 'html'],
      },
      testTimeout: 30000, // 30 seconds for cloud operations
    },
  });