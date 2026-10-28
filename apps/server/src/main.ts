// Composition root : le seul endroit qui choisit les adapters concrets. Vérifié par le smoke test
// de l'API compilée (scripts/smoke-test.mjs), pas par les tests unitaires.

import { creerLesCasDUsage } from '@slideshow/application';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GenerateurUuid, HorlogeSysteme } from './adapters/systeme.js';
import { HOTE, lireLaConfiguration } from './config/configuration.js';
import { DepotSqlite } from './database/DepotSqlite.js';
import { ouvrirLaBase } from './database/ouvrirLaBase.js';
import { creerLApplication } from './http/creerLApplication.js';

const configuration = lireLaConfiguration(process.env);
if (!configuration.ok) {
  console.error(`Configuration invalide :\n- ${configuration.error.join('\n- ')}`);
  process.exit(1);
}
const { port, cheminDeLaBase } = configuration.value;

const db = ouvrirLaBase(cheminDeLaBase);
// Depuis apps/server/dist : l'interface compilée par « pnpm build » est dans apps/web/dist.
const dossierDeLInterface = join(import.meta.dirname, '..', '..', 'web', 'dist');
const app = creerLApplication(
  creerLesCasDUsage({
    depot: new DepotSqlite(db),
    horloge: new HorlogeSysteme(),
    identifiants: new GenerateurUuid(),
  }),
  {
    journalisation: true,
    ...(existsSync(dossierDeLInterface) ? { dossierDeLInterface } : {}),
  },
);

const arreter = async () => {
  await app.close();
  db.close();
  process.exit(0);
};
process.once('SIGINT', () => void arreter());
process.once('SIGTERM', () => void arreter());

await app.listen({ host: HOTE, port });
