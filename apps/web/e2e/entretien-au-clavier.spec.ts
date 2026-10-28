// Critère de fin de la phase 5 : un entretien type se saisit sans souris. Ce parcours n'utilise que
// le clavier (aucun clic) et vérifie à la fin les chiffres du domaine et leur enregistrement.

import { expect, test, type Page } from '@playwright/test';

const touches = async (page: Page, ...combinaisons: string[]) => {
  for (const combinaison of combinaisons) await page.keyboard.press(combinaison);
};

/** Choisit une option d'une liste déroulante qui a le focus, en tapant le début de son libellé. */
const choisir = async (page: Page, debutDuLibelle: string) => {
  await page.keyboard.type(debutDuLibelle);
};

test('un entretien type se saisit entièrement au clavier', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Diagnostics d’automatisation' })).toBeVisible();

  // Ouverture du diagnostic : N, le prospect, Entrée.
  await touches(page, 'n');
  await page.keyboard.type('Négoce Durand');
  await touches(page, 'Tab');
  await page.keyboard.type('Négoce de matériaux');
  await touches(page, 'Tab');
  await page.keyboard.type('25');
  await touches(page, 'Enter');
  await expect(page.getByRole('heading', { name: 'Négoce Durand' })).toBeVisible();

  // Premier processus, depuis un modèle : les relances des impayés.
  await touches(page, 'Alt+n');
  await expect(page.getByLabel('Partir d’un modèle')).toBeFocused();
  await choisir(page, 'Relances des');
  await expect(page.getByLabel('Nom du processus')).toHaveValue('Relances des impayés');
  // Ctrl+Entrée deux fois : section « Combien », puis section « Avec quoi ».
  await touches(page, 'Control+Enter', 'Control+Enter');
  await expect(page.getByLabel('Outil source', { exact: true })).toBeFocused();
  await page.keyboard.type('Pennylane');
  await touches(page, 'Tab');
  await choisir(page, 'Comptab');
  await touches(page, 'Tab', 'Tab');
  await page.keyboard.type('Outlook');
  await touches(page, 'Tab');
  await choisir(page, 'Messagerie');
  await touches(page, 'Tab');
  await choisir(page, 'E-mail');

  const enDirect = page.getByRole('complementary', { name: 'En direct' });
  // 10 min × 15 par semaine × 45,6 semaines = 114 h par an.
  await expect(enDirect).toContainText('114 h/an');
  await expect(page.getByRole('status')).toContainText('Enregistré · version 2');

  // Second processus : la saisie des factures, avec les outils déjà cités (complétés tout seuls).
  await touches(page, 'Alt+n');
  await choisir(page, 'Saisie des factures');
  await touches(page, 'Control+Enter');
  await touches(page, 'Tab', 'Tab', 'Tab', 'Control+a');
  await page.keyboard.type('2');
  await touches(page, 'Control+Enter');
  await page.keyboard.type('Outlook');
  await touches(page, 'Tab', 'Tab', 'Tab');
  await page.keyboard.type('Pennylane');

  await expect(page.getByLabel('Accès (outil source)')).toHaveValue('email');
  await expect(page.getByLabel('Catégorie (outil cible)')).toHaveValue('comptabilite');
  // 4 min × 20 par jour × 228 jours × 2 personnes = 608 h par an.
  await expect(enDirect).toContainText('608 h/an');
  await expect(enDirect).toContainText('Total (2 processus)');
  await expect(page.getByRole('status')).toContainText(/Enregistré · version \d+/);

  // Tout est retrouvé après rechargement de la page.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Relances des impayés' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Saisie des factures fournisseurs' }),
  ).toBeVisible();
});
