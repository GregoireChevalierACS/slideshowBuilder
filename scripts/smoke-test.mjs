// Smoke test de l'API compilée : démarre apps/server/dist sur une base temporaire, vérifie qu'elle
// répond et enregistre, puis l'arrête. Les tests passent par les sources ; celui-ci prouve que le
// livrable démarre.
//
// Usage : node scripts/smoke-test.mjs (après pnpm build)

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = '43210';
const BASE = `http://127.0.0.1:${PORT}/api/diagnostics`;
const dossier = mkdtempSync(join(tmpdir(), 'slideshow-smoke-'));

const serveur = spawn(process.execPath, ['apps/server/dist/main.mjs'], {
  env: { ...process.env, PORT, CHEMIN_DE_LA_BASE: join(dossier, 'smoke.sqlite') },
  stdio: ['ignore', 'ignore', 'inherit'],
});

const attendreLeDemarrage = async () => {
  for (let essai = 0; essai < 50; essai++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // Pas encore prêt.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Le serveur compilé n’a pas démarré en 10 secondes.');
};

const verifier = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  await attendreLeDemarrage();

  const creation = await fetch(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nom: 'Smoke test' }),
  });
  verifier(creation.status === 201, `création : statut ${String(creation.status)}`);

  const liste = await (await fetch(BASE)).json();
  verifier(liste.length === 1 && liste[0].prospect === 'Smoke test', 'liste inattendue');

  const page = await fetch(`http://127.0.0.1:${PORT}/`);
  const html = await page.text();
  verifier(page.ok && html.includes('id="racine"'), 'interface non servie à la racine');

  console.log('✔ L’API compilée démarre, enregistre, relit un diagnostic et sert l’interface.');
} catch (erreur) {
  console.error(`✖ ${erreur.message}`);
  process.exitCode = 1;
} finally {
  // Sous Windows, le fichier SQLite reste verrouillé tant que le processus n'est pas terminé.
  const termine = new Promise((resolve) => serveur.once('exit', resolve));
  serveur.kill();
  await termine;
  rmSync(dossier, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
