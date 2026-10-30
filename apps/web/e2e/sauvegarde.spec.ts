// Changement de poste : un diagnostic exporté depuis l'entretien se réimporte depuis l'accueil, avec
// tout son historique. Vérifié contre le livrable compilé.

import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';

test('un diagnostic exporté se réimporte sur un autre poste, sans rien écraser', async ({
  page,
  request,
}, testInfo) => {
  const ouverture = await request.post('/api/diagnostics', { data: { nom: 'Atelier Lefèvre' } });
  const { id } = z.object({ id: z.string() }).parse(await ouverture.json());
  await page.goto(`/#/diagnostics/${id}`);
  await expect(page.getByRole('heading', { name: 'Atelier Lefèvre' })).toBeVisible();

  const telechargement = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Exporter' }).click();
  const fichier = await telechargement;
  expect(fichier.suggestedFilename()).toMatch(
    /^diagnostic-atelier-lefevre-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const chemin = testInfo.outputPath('export.json');
  await fichier.saveAs(chemin);

  // Le même fichier, vu par un autre poste : sous un identifiant que ce serveur ne connaît pas.
  const exporte = z
    .looseObject({ diagnostics: z.array(z.looseObject({ id: z.string() })) })
    .parse(JSON.parse(await readFile(chemin, 'utf8')));
  const autrePoste = testInfo.outputPath('autre-poste.json');
  await writeFile(
    autrePoste,
    JSON.stringify({
      ...exporte,
      diagnostics: exporte.diagnostics.map((d) => ({ ...d, id: `${id}-copie` })),
    }),
  );

  await page.goto('/');
  const importer = page.getByLabel('Importer un export…');
  await importer.setInputFiles(autrePoste);
  await expect(page.getByRole('status')).toContainText('Atelier Lefèvre : importé (1 version)');
  await expect(page.getByRole('link', { name: /Atelier Lefèvre/ })).toHaveCount(2);

  // Réimporter le fichier d'origine ne change rien : le diagnostic est déjà là, à l'identique.
  await importer.setInputFiles(chemin);
  await expect(page.getByRole('status')).toContainText('déjà à jour sur ce poste');
  await expect(page.getByRole('link', { name: /Atelier Lefèvre/ })).toHaveCount(2);
});

test('un fichier qui n’est pas un export est refusé en entier', async ({ page }, testInfo) => {
  const chemin = testInfo.outputPath('autre.json');
  await writeFile(chemin, JSON.stringify({ nom: 'pas un export' }));
  await page.goto('/');

  await page.getByLabel('Importer un export…').setInputFiles(chemin);

  await expect(page.getByRole('alert')).toContainText(
    'Ce fichier n’est pas un export de diagnostics. Rien n’a été importé.',
  );
});
