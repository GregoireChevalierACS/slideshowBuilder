import { defineProject } from 'vitest/config';

// Les tests lisent les sources des paquets (condition d'export « source ») : pas de build préalable.
const conditionsSource = { conditions: ['source'] };

export default defineProject({
  resolve: conditionsSource,
  ssr: { resolve: conditionsSource },
  test: { name: 'server', include: ['src/**/*.test.ts'] },
});
