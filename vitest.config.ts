import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Chaque paquet décrit son projet dans son propre vitest.config.ts (réutilisé par Stryker).
    projects: ['packages/*'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts', '**/testing/**'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        // Le domaine porte les chiffres présentés au client : rien n'y échappe aux tests.
        'packages/domain/src/**': { lines: 100, branches: 100, functions: 100, statements: 100 },
        // La couche application traduit les saisies et orchestre : chaque branche est un cas métier.
        'packages/application/src/**': {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  },
});
