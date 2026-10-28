import react from '@vitejs/plugin-react';
import { defineProject } from 'vitest/config';

const conditionsSource = { conditions: ['source'] };

export default defineProject({
  plugins: [react()],
  resolve: conditionsSource,
  test: {
    name: 'web',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/testing/preparation.ts'],
  },
});
