// Critère de fin de la phase 6 : un deck chargé se présente au clavier et s'exporte en PDF, sans
// qu'aucune diapositive ne déborde de son cadre. Vérifié contre le livrable compilé.

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { z } from 'zod';

const NATURES = [
  'saisie',
  'relance',
  'tri',
  'generation-de-document',
  'rapprochement',
  'reporting',
] as const;

/** Un diagnostic volontairement chargé : 12 processus aux noms longs, IA, documents, une alerte. */
const preparerUnDiagnosticCharge = async (requete: APIRequestContext): Promise<string> => {
  const ouverture = await requete.post('/api/diagnostics', {
    data: {
      nom: 'Société de négoce de matériaux Durand et fils',
      secteur: 'Négoce de matériaux de construction',
      effectifTotal: 85,
    },
  });
  const { id } = z.object({ id: z.string() }).parse(await ouverture.json());
  const processus = Array.from({ length: 12 }, (_, i) => ({
    nom: `Processus administratif numéro ${String(i + 1)} au nom particulièrement long`,
    dureeUnitaireEnSecondes: i === 0 ? 8 * 3_600 : 300 + 60 * i,
    frequence: { nombre: 1 + i, periode: i % 2 === 0 ? 'jour' : 'semaine' },
    personnes: 1 + (i % 4),
    tauxBas: 40,
    tauxHaut: 70,
    coutHoraire: { kind: 'Direct', centimesParHeure: 3_500 + 100 * i },
    profil: {
      nature: NATURES[i % NATURES.length],
      source: {
        nom: `Logiciel source ${String(i % 5)}`,
        categorie: 'messagerie',
        acces: i % 3 === 0 ? 'email' : 'api',
      },
      cible: {
        nom: `Logiciel cible ${String(i % 4)}`,
        categorie: 'comptabilite',
        acces: i % 4 === 0 ? 'aucun' : 'api',
      },
      donnees: i % 3 === 0 ? 'documents' : 'structurees',
      decisionHumaine: i % 5 === 0 ? 'ponctuelle' : 'aucune',
    },
  }));
  const revision = await requete.put(`/api/diagnostics/${id}`, {
    data: {
      versionAttendue: 1,
      prospect: { nom: 'Société de négoce de matériaux Durand et fils' },
      hypotheses: { joursTravaillesParAn: 228, heuresAnnuellesTempsPlein: 1_607 },
      processus,
    },
  });
  expect(revision.ok()).toBe(true);
  return id;
};

/** Les diapositives dont le contenu dépasse le cadre 16:9 (hauteur ou largeur). */
const diapositivesQuiDebordent = (page: Page) =>
  page.locator('.impression .diapositive').evaluateAll((diapositives) =>
    diapositives.flatMap((d, numero) => {
      const deborde = (e: Element) =>
        e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1;
      // La diapositive, son contenu, et chaque boîte du schéma d'architecture.
      const fautifs = [d, ...d.querySelectorAll('.contenu-de-diapositive, .schema .boite')].filter(
        deborde,
      );
      return fautifs.length === 0
        ? []
        : [`${String(numero + 1)} (${d.getAttribute('class') ?? ''})`];
    }),
  );

test('un deck chargé se présente au clavier, de la première à la dernière diapositive', async ({
  page,
  request,
}) => {
  const id = await preparerUnDiagnosticCharge(request);
  await page.goto(`/#/diagnostics/${id}/presentation?public=technique&duree=complete`);
  const apercu = page.getByRole('list', { name: 'Aperçu des diapositives' }).getByRole('button');
  const nombre = await apercu.count();
  expect(nombre).toBeGreaterThan(15);

  await page.keyboard.press('Enter');
  const compteur = page.locator('.scene .compteur');
  await expect(compteur).toHaveText(`1 / ${String(nombre)}`);
  for (let i = 1; i < nombre; i++) await page.keyboard.press('ArrowRight');
  await expect(compteur).toHaveText(`${String(nombre)} / ${String(nombre)}`);
  await expect(page.locator('.scene .diapositive')).toContainText('Hypothèses de calcul');
});

for (const publicVise of ['dirigeant', 'technique'] as const) {
  test(`aucune diapositive ne déborde de son cadre (public ${publicVise})`, async ({
    page,
    request,
  }) => {
    const id = await preparerUnDiagnosticCharge(request);
    await page.goto(`/#/diagnostics/${id}/presentation?public=${publicVise}&duree=complete`);
    await expect(page.getByRole('heading', { name: /^Présenter/ })).toBeVisible();
    await page.emulateMedia({ media: 'print' });

    expect(await diapositivesQuiDebordent(page)).toStrictEqual([]);
  });
}

test('le PDF contient une page par diapositive, et aucune note du présentateur', async ({
  page,
  request,
}) => {
  const id = await preparerUnDiagnosticCharge(request);
  await page.goto(`/#/diagnostics/${id}/presentation?public=dirigeant&duree=complete`);
  await expect(page.getByRole('heading', { name: /^Présenter/ })).toBeVisible();
  const nombre = await page.locator('.impression .diapositive').count();

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.impression')).not.toContainText('À vérifier');
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString(
    'latin1',
  );

  expect(pdf.match(/\/Type\s*\/Page(?!s)/g)).toHaveLength(nombre);
});
