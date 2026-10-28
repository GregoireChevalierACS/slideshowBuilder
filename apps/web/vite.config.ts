import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Les paquets du dépôt sont lus depuis leurs sources TypeScript : pas de build préalable.
  resolve: { conditions: ['source', ...defaultClientConditions] },
  server: {
    host: '127.0.0.1',
    // En développement, l'API tourne à part : Vite lui relaie les appels.
    proxy: { '/api': 'http://127.0.0.1:4321' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
