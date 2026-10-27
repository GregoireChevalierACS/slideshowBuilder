import { defineConfig } from 'vitest/config';

const TOUT = { lines: 100, branches: 100, functions: 100, statements: 100 };

export default defineConfig({
  test: {
    // Chaque paquet décrit son projet dans son propre vitest.config.ts (réutilisé par Stryker).
    projects: ['packages/*', 'apps/*'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
      // main.ts est la composition root : il est vérifié par le smoke test de l'API compilée.
      exclude: ['**/*.test.ts', '**/index.ts', '**/testing/**', 'apps/server/src/main.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        // Le domaine porte les chiffres présentés au client : rien n'y échappe aux tests.
        'packages/domain/src/**': TOUT,
        // La couche application traduit les saisies et orchestre : chaque branche est un cas métier.
        'packages/application/src/**': TOUT,
        // Le serveur traduit HTTP et SQL : chaque branche est un statut ou une contrainte.
        'apps/server/src/**': TOUT,
      },
    },
  },
});
