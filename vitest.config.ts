import { defineConfig } from 'vitest/config';

// Les tests lisent les sources des paquets (condition d'export « source ») : pas de build préalable.
const conditionsSource = { conditions: ['source'] };

export default defineConfig({
  resolve: conditionsSource,
  ssr: { resolve: conditionsSource },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'domain', root: 'packages/domain', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'application',
          root: 'packages/application',
          include: ['src/**/*.test.ts'],
        },
      },
    ],
    // Tant que la phase 1 n'a pas commencé, aucun fichier de test n'existe.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        // Le domaine porte les chiffres présentés au client : rien n'y échappe aux tests.
        'packages/domain/src/**': { lines: 100, branches: 100, functions: 100, statements: 100 },
      },
    },
  },
});
