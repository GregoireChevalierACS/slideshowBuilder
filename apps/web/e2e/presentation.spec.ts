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

/**
 * Un diagnostic volontairement chargé : 12 processus aux noms longs, dont 2 abandonnés, IA,
 * documents, une alerte, et
 * 3 options d'hébergement aux noms et aux points aussi longs que le domaine le permet.
 */
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
    // Les deux derniers ne sont plus faits : la rubrique du travail rattrapé est pleine.
    ...(i >= 10 ? { abandonne: true } : {}),
  }));
  const revision = await requete.put(`/api/diagnostics/${id}`, {
    data: {
      versionAttendue: 1,
      prospect: { nom: 'Société de négoce de matériaux Durand et fils' },
      hypotheses: { joursTravaillesParAn: 228, heuresAnnuellesTempsPlein: 1_607 },
      processus,
      // Un jaune vif, que le domaine assombrit, et un logo (une image PNG d'un pixel).
      theme: {
        couleur: '#ffd400',
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
      // Noms et points aussi nombreux et aussi longs que le domaine le permet (40 caractères).
      options: [
        'Au bureau, sur un mini-serveur à vous',
        'Dans le cloud, chez un hébergeur choisi',
        'Offre type agence (audit + abonnement)',
      ].map((nom, i) => ({
        nom,
        miseEnPlaceEnCentimes: 250_000 + 100_000 * i,
        materielEnCentimes: i === 0 ? 120_000 : 0,
        fraisMensuelsBasEnCentimes: 4_500 + 5_000 * i,
        fraisMensuelsHautEnCentimes: 9_000 + 10_000 * i,
        // De vraies phrases, jusqu'à 40 caractères : une largeur de lettres réaliste.
        inclus: [
          'Maintenance, mises à jour et sauvegardes',
          'Assistance par téléphone et par e-mail',
          'Formation de l’équipe au nouvel outil',
        ],
        limites: [
          'Dépend de la connexion internet du site',
          'Matériel à renouveler tous les cinq ans',
          'Mise en service sous trois à quatre mois',
        ],
      })),
    },
  });
  expect(revision.ok()).toBe(true);
  return id;
};

/**
 * Les diapositives qui débordent du cadre 16:9, ou dont le contenu arrive à moins de 10 % de la
 * hauteur du bas : les polices varient d'un système à l'autre (Windows, le Linux de la CI), une
 * diapositive trop juste sur une machine déborde sur une autre.
 */
const diapositivesTropPleines = async (page: Page) => {
  // Mesurer avec la police embarquée, pas avec celle de remplacement affichée pendant son chargement.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  return page.locator('.impression .diapositive').evaluateAll((diapositives) =>
    diapositives.flatMap((d, numero) => {
      const deborde = (e: Element) =>
        e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1;
      // La diapositive, son contenu, et chaque boîte du schéma d'architecture.
      const debordements = [
        d,
        ...d.querySelectorAll('.contenu-de-diapositive, .schema .boite'),
      ].filter(deborde);
      // 10 % : l'écart mesuré entre les polices de Windows et celles du Linux de la CI.
      const reserve = 0.1 * d.getBoundingClientRect().height;
      // Le schéma s'étire volontairement pour occuper la place : il n'a pas de réserve à garder.
      const tropJustes = [
        ...d.querySelectorAll('.contenu-de-diapositive:not(:has(.schema))'),
      ].filter((contenu) => {
        const dernier = contenu.lastElementChild;
        return (
          dernier !== null &&
          contenu.getBoundingClientRect().bottom - dernier.getBoundingClientRect().bottom < reserve
        );
      });
      return debordements.length + tropJustes.length === 0
        ? []
        : [`${String(numero + 1)} (${d.getAttribute('class') ?? ''})`];
    }),
  );
};

test('un deck chargé se présente au clavier, de la première à la dernière diapositive', async ({
  page,
  request,
}) => {
  const id = await preparerUnDiagnosticCharge(request);
  await page.goto(`/#/diagnostics/${id}/presentation?public=technique&duree=complete`);
  const apercu = page.getByRole('list', { name: 'Aperçu des diapositives' }).getByRole('button');
  // count() n'attend pas : sans cette attente, une machine chargée compte un aperçu encore vide.
  await expect(apercu.first()).toBeVisible();
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
  test(`aucune diapositive ne déborde ni n’est trop juste (public ${publicVise})`, async ({
    page,
    request,
  }) => {
    const id = await preparerUnDiagnosticCharge(request);
    await page.goto(`/#/diagnostics/${id}/presentation?public=${publicVise}&duree=complete`);
    await expect(page.getByRole('heading', { name: /^Présenter/ })).toBeVisible();
    await page.emulateMedia({ media: 'print' });

    expect(await diapositivesTropPleines(page)).toStrictEqual([]);
  });
}

/** Les diapositives réduites (aperçu, vue présentateur) dont le contenu déborde de leur cadre. */
const reductionsQuiDebordent = (page: Page, selecteur: string) =>
  page.locator(selecteur).evaluateAll((diapositives) =>
    diapositives
      .filter((d) => {
        const deborde = (e: Element) =>
          e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1;
        return [d, ...d.querySelectorAll('.contenu-de-diapositive')].some(deborde);
      })
      .map((d) => d.getAttribute('class') ?? ''),
  );

test('les miniatures sont de vraies réductions : rien ne déborde de son cadre', async ({
  page,
  request,
}) => {
  // Les tailles en cqw doivent se mesurer sur la diapositive, pas sur la fenêtre : sinon, le texte
  // d'une miniature est aussi grand qu'en plein écran.
  const id = await preparerUnDiagnosticCharge(request);
  await page.goto(`/#/diagnostics/${id}/presentation?public=technique&duree=complete`);
  await expect(page.getByRole('heading', { name: /^Présenter/ })).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  expect(await reductionsQuiDebordent(page, '.apercu .diapositive')).toStrictEqual([]);

  await page.goto(`/#/diagnostics/${id}/presentateur?public=technique&duree=complete`);
  await expect(page.getByRole('region', { name: 'Diapositive suivante' })).toBeVisible();
  expect(await reductionsQuiDebordent(page, '.vues .diapositive')).toStrictEqual([]);
});

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
