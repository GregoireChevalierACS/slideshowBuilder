import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/main.ts'],
  format: 'esm',
  platform: 'node',
  clean: true,
  // Les paquets du dépôt sont intégrés au bundle : dist/ démarre sans sources TypeScript.
  deps: { alwaysBundle: [/^@slideshow\//] },
});
