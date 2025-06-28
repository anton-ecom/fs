import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
      include: ['test/**/*.test.ts'], // Changed to include subdirectories
      coverage: {
        reporter: ['text', 'json', 'html'],
      },
    },
  });