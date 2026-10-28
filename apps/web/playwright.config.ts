import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 43_211;

// Le parcours tourne contre le livrable compilé (pnpm build) : serveur et interface, sur une base
// temporaire, exactement comme en rendez-vous.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  forbidOnly: process.env['CI'] !== undefined,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://127.0.0.1:${String(PORT)}`, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'node ../server/dist/main.mjs',
    url: `http://127.0.0.1:${String(PORT)}/api/diagnostics`,
    reuseExistingServer: false,
    env: {
      PORT: String(PORT),
      CHEMIN_DE_LA_BASE: join(mkdtempSync(join(tmpdir(), 'slideshow-e2e-')), 'e2e.sqlite'),
    },
  },
});
