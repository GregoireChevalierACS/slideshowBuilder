import {
  creerLesCasDUsage,
  schemaDeDiagnosticPublie,
  schemaDeResumeDeDiagnostic,
  schemaDExport,
  schemaDuCompteRenduDImport,
  type CasDUsage,
} from '@slideshow/application';
import {
  HorlogeFixe,
  IdentifiantsSequentiels,
  uneSaisieDeDiagnostic,
  uneSaisieDeProcessus,
} from '@slideshow/application/testing';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DepotSqlite } from '../database/DepotSqlite.js';
import { uneBaseEnMemoire } from '../database/testing/uneBaseEnMemoire.js';
import { creerLApplication } from './creerLApplication.js';

const unExportVide = () => ({
  format: 'slideshow-builder/diagnostics',
  versionDuFormat: 1,
  exporteLe: '2026-10-27',
  diagnostics: [],
});

const PROBLEME = 'application/problem+json; charset=utf-8';

/** La même application qu'en production, sur une base SQLite en mémoire. */
const uneApplication = (casDUsage?: CasDUsage) => {
  return creerLApplication(
    casDUsage ??
      creerLesCasDUsage({
        depot: new DepotSqlite(uneBaseEnMemoire()),
        horloge: new HorlogeFixe('2026-10-27'),
        identifiants: new IdentifiantsSequentiels(),
      }),
  );
};

const ouvrir = async (app: ReturnType<typeof uneApplication>, nom = 'Négoce Durand') =>
  app.inject({ method: 'POST', url: '/api/diagnostics', payload: { nom } });

const corps = (reponse: { body: string }): unknown => JSON.parse(reponse.body);

const diapositives = (reponse: { body: string }) =>
  z.object({ diapositives: z.array(z.looseObject({ kind: z.string() })) }).parse(corps(reponse))
    .diapositives;

describe('API HTTP', () => {
  it('respecte le contrat publié dans chacune de ses réponses réussies', async () => {
    const app = uneApplication();
    const ouverture = await ouvrir(app);
    const revision = await app.inject({
      method: 'PUT',
      url: '/api/diagnostics/diagnostic-1',
      payload: {
        versionAttendue: 1,
        prospect: { nom: 'Négoce Durand', secteur: 'Négoce', effectifTotal: 25 },
        hypotheses: { joursTravaillesParAn: 228, heuresAnnuellesTempsPlein: 1_607 },
        processus: [uneSaisieDeProcessus()],
      },
    });
    const consultation = await app.inject({ method: 'GET', url: '/api/diagnostics/diagnostic-1' });
    const liste = await app.inject({ method: 'GET', url: '/api/diagnostics' });

    for (const reponse of [ouverture, revision, consultation]) {
      expect(schemaDeDiagnosticPublie.safeParse(corps(reponse)).success).toBe(true);
    }
    expect(z.array(schemaDeResumeDeDiagnostic).safeParse(corps(liste)).success).toBe(true);
  });

  describe('POST /api/diagnostics', () => {
    it('ouvre un diagnostic : 201, emplacement et version 1', async () => {
      const reponse = await ouvrir(uneApplication());

      expect(reponse.statusCode).toBe(201);
      expect(reponse.headers.location).toBe('/api/diagnostics/diagnostic-1');
      expect(corps(reponse)).toStrictEqual({
        id: 'diagnostic-1',
        version: 1,
        saisie: {
          prospect: { nom: 'Négoce Durand' },
          dateDEntretien: '2026-10-27',
          hypotheses: { joursTravaillesParAn: 228, heuresAnnuellesTempsPlein: 1_607 },
          processus: [],
        },
      });
    });

    it('refuse une structure invalide : 400 en Problem Details, avec chaque champ en cause', async () => {
      const reponse = await uneApplication().inject({
        method: 'POST',
        url: '/api/diagnostics',
        payload: { nom: 42, inconnu: true },
      });

      expect(reponse.statusCode).toBe(400);
      expect(reponse.headers['content-type']).toBe(PROBLEME);
      expect(corps(reponse)).toMatchObject({
        type: '/problemes/requete-invalide',
        title: 'Requête invalide',
        status: 400,
      });
      const { erreurs } = z
        .object({ erreurs: z.array(z.object({ chemin: z.string(), message: z.string() })) })
        .parse(corps(reponse));
      expect(erreurs.map((e) => e.chemin)).toStrictEqual(['nom', '']);
      expect(erreurs[1]?.message).toContain('inconnu');
    });

    it('refuse un corps qui n’est pas du JSON : 400', async () => {
      const reponse = await uneApplication().inject({
        method: 'POST',
        url: '/api/diagnostics',
        headers: { 'content-type': 'application/json' },
        payload: '{ pas du json',
      });

      expect(reponse.statusCode).toBe(400);
      expect(corps(reponse)).toMatchObject({ type: '/problemes/requete-invalide' });
    });

    it('refuse une valeur interdite par une règle métier : 422, avec le champ', async () => {
      const reponse = await ouvrir(uneApplication(), '   ');

      expect(reponse.statusCode).toBe(422);
      expect(reponse.headers['content-type']).toBe(PROBLEME);
      expect(corps(reponse)).toStrictEqual({
        type: '/problemes/saisie-invalide',
        title: 'Saisie invalide',
        status: 422,
        detail: 'Le champ « prospect.nom » est refusé : NomDeProspectVide.',
        champ: 'prospect.nom',
        erreur: { kind: 'NomDeProspectVide' },
      });
    });
  });

  describe('GET /api/diagnostics', () => {
    it('liste les diagnostics', async () => {
      const app = uneApplication();
      await ouvrir(app);

      const reponse = await app.inject({ method: 'GET', url: '/api/diagnostics' });

      expect(reponse.statusCode).toBe(200);
      expect(corps(reponse)).toStrictEqual([
        {
          id: 'diagnostic-1',
          prospect: 'Négoce Durand',
          dateDEntretien: '2026-10-27',
          derniereVersion: 1,
        },
      ]);
    });
  });

  describe('GET /api/diagnostics/:id', () => {
    it('rend la dernière version, ou celle demandée', async () => {
      const app = uneApplication();
      await ouvrir(app);
      await app.inject({
        method: 'PUT',
        url: '/api/diagnostics/diagnostic-1',
        payload: {
          versionAttendue: 1,
          prospect: { nom: 'Durand SAS' },
          hypotheses: { joursTravaillesParAn: 228, heuresAnnuellesTempsPlein: 1_607 },
          processus: [],
        },
      });

      const derniere = await app.inject({ method: 'GET', url: '/api/diagnostics/diagnostic-1' });
      const premiere = await app.inject({
        method: 'GET',
        url: '/api/diagnostics/diagnostic-1?version=1',
      });

      expect(corps(derniere)).toMatchObject({
        version: 2,
        saisie: { prospect: { nom: 'Durand SAS' } },
      });
      expect(corps(premiere)).toMatchObject({
        version: 1,
        saisie: { prospect: { nom: 'Négoce Durand' } },
      });
    });

    it.each([
      ['/api/diagnostics/inconnu', 'Aucun diagnostic « inconnu ».'],
      [
        '/api/diagnostics/diagnostic-1?version=7',
        'Le diagnostic « diagnostic-1 » n’a pas de version 7.',
      ],
      ['/api/diagnostics/pas%20valide', 'Aucun diagnostic « pas valide ».'],
    ])('répond 404 pour %s', async (url, detail) => {
      const app = uneApplication();
      await ouvrir(app);

      const reponse = await app.inject({ method: 'GET', url });

      expect(reponse.statusCode).toBe(404);
      expect(corps(reponse)).toStrictEqual({
        type: '/problemes/diagnostic-introuvable',
        title: 'Diagnostic introuvable',
        status: 404,
        detail,
      });
    });

    it('refuse une version qui n’est pas un entier : 400', async () => {
      const reponse = await uneApplication().inject({
        method: 'GET',
        url: '/api/diagnostics/diagnostic-1?version=deux',
      });

      expect(reponse.statusCode).toBe(400);
    });
  });

  describe('PUT /api/diagnostics/:id', () => {
    const revision = (versionAttendue: number, surcharges: Record<string, unknown> = {}) => ({
      versionAttendue,
      prospect: { nom: 'Négoce Durand' },
      hypotheses: { joursTravaillesParAn: 228, heuresAnnuellesTempsPlein: 1_607 },
      processus: [uneSaisieDeProcessus()],
      ...surcharges,
    });

    it('enregistre la version suivante', async () => {
      const app = uneApplication();
      await ouvrir(app);

      const reponse = await app.inject({
        method: 'PUT',
        url: '/api/diagnostics/diagnostic-1',
        payload: revision(1),
      });

      expect(reponse.statusCode).toBe(200);
      expect(corps(reponse)).toMatchObject({
        id: 'diagnostic-1',
        version: 2,
        saisie: { processus: [{ nom: 'Saisie des factures fournisseurs' }] },
      });
    });

    it('refuse une révision d’une version périmée : 409, avec la version actuelle', async () => {
      const app = uneApplication();
      await ouvrir(app);
      await app.inject({
        method: 'PUT',
        url: '/api/diagnostics/diagnostic-1',
        payload: revision(1),
      });

      const reponse = await app.inject({
        method: 'PUT',
        url: '/api/diagnostics/diagnostic-1',
        payload: revision(1),
      });

      expect(reponse.statusCode).toBe(409);
      expect(corps(reponse)).toStrictEqual({
        type: '/problemes/version-perimee',
        title: 'Version périmée',
        status: 409,
        detail: 'La version 1 n’est plus la dernière : recharger la version 2 avant de réviser.',
        versionActuelle: 2,
      });
    });

    it('refuse une règle métier : 422', async () => {
      const app = uneApplication();
      await ouvrir(app);

      const reponse = await app.inject({
        method: 'PUT',
        url: '/api/diagnostics/diagnostic-1',
        payload: revision(1, { processus: [uneSaisieDeProcessus({ tauxBas: 95, tauxHaut: 90 })] }),
      });

      expect(reponse.statusCode).toBe(422);
      expect(corps(reponse)).toMatchObject({ champ: 'processus[0].tauxBas' });
    });

    it('refuse une structure invalide : 400', async () => {
      const app = uneApplication();
      await ouvrir(app);

      const reponse = await app.inject({
        method: 'PUT',
        url: '/api/diagnostics/diagnostic-1',
        payload: { versionAttendue: 1 },
      });

      expect(reponse.statusCode).toBe(400);
    });

    it.each(['inconnu', 'pas%20valide'])('répond 404 pour un diagnostic « %s »', async (id) => {
      const reponse = await uneApplication().inject({
        method: 'PUT',
        url: `/api/diagnostics/${id}`,
        payload: revision(1),
      });

      expect(reponse.statusCode).toBe(404);
    });
  });

  describe('GET /api/diagnostics/:id/deck', () => {
    it('construit le deck selon le public et la durée', async () => {
      const app = uneApplication();
      await ouvrir(app);

      const reponse = await app.inject({
        method: 'GET',
        url: '/api/diagnostics/diagnostic-1/deck?public=dirigeant&duree=courte',
      });

      expect(reponse.statusCode).toBe(200);
      expect(diapositives(reponse).map((d) => d.kind)).toStrictEqual([
        'Titre',
        'CoutCache',
        'Architecture',
        'GainsAttendus',
        'FeuilleDeRoute',
      ]);
    });

    it('construit le deck d’une version précise', async () => {
      const app = uneApplication();
      await ouvrir(app);

      const reponse = await app.inject({
        method: 'GET',
        url: '/api/diagnostics/diagnostic-1/deck?public=dirigeant&duree=courte&version=1',
      });

      expect(diapositives(reponse)[0]).toMatchObject({ kind: 'Titre', version: 1 });
    });

    it('exige le public et la durée : 400', async () => {
      const reponse = await uneApplication().inject({
        method: 'GET',
        url: '/api/diagnostics/diagnostic-1/deck?public=tout-le-monde',
      });

      expect(reponse.statusCode).toBe(400);
    });

    it.each(['inconnu', 'pas%20valide'])('répond 404 pour un diagnostic « %s »', async (id) => {
      const reponse = await uneApplication().inject({
        method: 'GET',
        url: `/api/diagnostics/${id}/deck?public=dirigeant&duree=courte`,
      });

      expect(reponse.statusCode).toBe(404);
    });
  });

  describe('protections', () => {
    it.each(['evil.example', 'evil.example:4321', '192.168.1.10:4321'])(
      'refuse une requête adressée à un autre hôte que la machine (« %s ») : 403',
      async (host) => {
        const reponse = await uneApplication().inject({
          method: 'GET',
          url: '/api/diagnostics',
          headers: { host },
        });

        expect(reponse.statusCode).toBe(403);
        expect(corps(reponse)).toMatchObject({ type: '/problemes/hote-refuse' });
      },
    );

    it.each(['localhost:4321', '127.0.0.1:4321', 'localhost'])(
      'accepte l’hôte « %s »',
      async (host) => {
        const reponse = await uneApplication().inject({
          method: 'GET',
          url: '/api/diagnostics',
          headers: { host },
        });

        expect(reponse.statusCode).toBe(200);
      },
    );

    it('répond 404 en Problem Details pour une route inconnue', async () => {
      const reponse = await uneApplication().inject({ method: 'GET', url: '/api/inconnue' });

      expect(reponse.statusCode).toBe(404);
      expect(corps(reponse)).toStrictEqual({
        type: '/problemes/route-inconnue',
        title: 'Route inconnue',
        status: 404,
        detail: 'GET /api/inconnue n’existe pas.',
      });
    });

    it('masque le détail d’une panne : 500 sans message interne', async () => {
      const enPanne = creerLesCasDUsage({
        depot: {
          enregistrer: () => {
            throw new Error('mot de passe en clair');
          },
          derniereVersion: () => undefined,
          version: () => undefined,
          historique: () => [],
          importer: () => {
            throw new Error('mot de passe en clair');
          },
          lister: () => {
            throw new Error('mot de passe en clair');
          },
        },
        horloge: new HorlogeFixe(),
        identifiants: new IdentifiantsSequentiels(),
      });

      const reponse = await uneApplication(enPanne).inject({
        method: 'GET',
        url: '/api/diagnostics',
      });

      expect(reponse.statusCode).toBe(500);
      expect(corps(reponse)).toStrictEqual({
        type: '/problemes/erreur-interne',
        title: 'Erreur interne',
        status: 500,
      });
      expect(reponse.body).not.toContain('mot de passe');
    });
  });
});

describe('export et import', () => {
  const exporter = async (app: ReturnType<typeof uneApplication>, url: string) => {
    const reponse = await app.inject({ method: 'GET', url });
    return { reponse, contenu: schemaDExport.parse(corps(reponse)) };
  };

  const importer = (app: ReturnType<typeof uneApplication>, payload: string | object) =>
    app.inject({
      method: 'POST',
      url: '/api/import',
      headers: { 'content-type': 'application/json' },
      payload,
    });

  it('exporte un diagnostic en fichier nommé d’après le prospect', async () => {
    const app = uneApplication();
    await ouvrir(app);

    const { reponse, contenu } = await exporter(app, '/api/diagnostics/diagnostic-1/export');

    expect(reponse.statusCode).toBe(200);
    expect(reponse.headers['content-disposition']).toBe(
      'attachment; filename="diagnostic-negoce-durand-2026-10-27.json"',
    );
    expect(contenu.diagnostics.map((d) => d.id)).toStrictEqual(['diagnostic-1']);
  });

  it('exporte tous les diagnostics du poste', async () => {
    const app = uneApplication();
    await ouvrir(app, 'Alpha');
    await ouvrir(app, 'Bravo');

    const { reponse, contenu } = await exporter(app, '/api/export');

    expect(reponse.headers['content-disposition']).toBe(
      'attachment; filename="diagnostics-2026-10-27.json"',
    );
    expect(contenu.diagnostics).toHaveLength(2);
  });

  it('refuse l’export d’un diagnostic inconnu : 404', async () => {
    const reponse = await uneApplication().inject({
      method: 'GET',
      url: '/api/diagnostics/inconnu/export',
    });

    expect(reponse.statusCode).toBe(404);
    expect(corps(reponse)).toMatchObject({ type: '/problemes/diagnostic-introuvable' });
  });

  it('importe sur un autre poste ce qu’un poste a exporté, avec un compte rendu', async () => {
    const source = uneApplication();
    await ouvrir(source);
    const { contenu } = await exporter(source, '/api/export');
    const cible = uneApplication();

    const reponse = await importer(cible, contenu);
    const deNouveau = await importer(cible, contenu);

    expect(reponse.statusCode).toBe(200);
    expect(schemaDuCompteRenduDImport.parse(corps(reponse))).toStrictEqual([
      { id: 'diagnostic-1', prospect: 'Négoce Durand', statut: 'importe', versionsAjoutees: 1 },
    ]);
    expect(corps(deNouveau)).toMatchObject([{ statut: 'aJour' }]);
    expect(
      corps(await cible.inject({ method: 'GET', url: '/api/diagnostics/diagnostic-1' })),
    ).toMatchObject({ saisie: { prospect: { nom: 'Négoce Durand' } } });
  });

  it('accepte une sauvegarde de plus de 1 Mio', async () => {
    const versions = Array.from({ length: 600 }, (_, i) => ({
      version: i + 1,
      saisie: uneSaisieDeDiagnostic({
        processus: Array.from({ length: 5 }, (_, j) =>
          uneSaisieDeProcessus({ nom: `P${String(j)}` }),
        ),
      }),
    }));
    const contenu = JSON.stringify({ ...unExportVide(), diagnostics: [{ id: 'a', versions }] });

    expect(contenu.length).toBeGreaterThan(1024 * 1024);
    expect((await importer(uneApplication(), contenu)).statusCode).toBe(200);
  });

  it('refuse un fichier qui n’est pas du JSON : 400', async () => {
    expect((await importer(uneApplication(), '{ pas du json')).statusCode).toBe(400);
  });

  it.each([
    ['un autre JSON', { nom: 'x' }, 'n’est pas un export'],
    ['un format plus récent', { ...unExportVide(), versionDuFormat: 2 }, 'version plus récente'],
    [
      'une structure modifiée',
      { ...unExportVide(), diagnostics: [{ id: 'a' }] },
      'diagnostics.0.versions',
    ],
    [
      'un identifiant invalide',
      {
        ...unExportVide(),
        diagnostics: [{ id: 'é', versions: [{ version: 1, saisie: uneSaisieDeDiagnostic() }] }],
      },
      'identifiant « é »',
    ],
    [
      'un diagnostic en double',
      {
        ...unExportVide(),
        diagnostics: [1, 2].map(() => ({
          id: 'a',
          versions: [{ version: 1, saisie: uneSaisieDeDiagnostic() }],
        })),
      },
      'figure deux fois',
    ],
    [
      'une version manquante',
      {
        ...unExportVide(),
        diagnostics: [{ id: 'a', versions: [{ version: 2, saisie: uneSaisieDeDiagnostic() }] }],
      },
      'Il manque la version 1',
    ],
    [
      'une valeur refusée par le domaine',
      {
        ...unExportVide(),
        diagnostics: [
          {
            id: 'a',
            versions: [
              { version: 1, saisie: uneSaisieDeDiagnostic({ dateDEntretien: '2026-02-30' }) },
            ],
          },
        ],
      },
      'diagnostics[0].versions[0].saisie.dateDEntretien',
    ],
  ])('refuse le fichier entier pour %s : 422, sans rien importer', async (_, fichier, detail) => {
    const app = uneApplication();

    const reponse = await importer(app, fichier);

    expect(reponse.statusCode).toBe(422);
    expect(reponse.headers['content-type']).toBe(PROBLEME);
    const probleme = z.object({ type: z.string(), detail: z.string() }).parse(corps(reponse));
    expect(probleme.type).toBe('/problemes/export-illisible');
    expect(probleme.detail).toContain(detail);
    expect(probleme.detail).toContain('Rien n’a été importé.');
    expect(corps(await app.inject({ method: 'GET', url: '/api/diagnostics' }))).toStrictEqual([]);
  });
});

describe('interface compilée', () => {
  const dossierDeLInterface = () => {
    const dossier = mkdtempSync(join(tmpdir(), 'slideshow-web-'));
    writeFileSync(join(dossier, 'index.html'), '<!doctype html><title>Interface de test</title>');
    return dossier;
  };

  it('est servie à la racine, à côté de l’API', async () => {
    const dossier = dossierDeLInterface();
    const app = creerLApplication(
      creerLesCasDUsage({
        depot: new DepotSqlite(uneBaseEnMemoire()),
        horloge: new HorlogeFixe(),
        identifiants: new IdentifiantsSequentiels(),
      }),
      { dossierDeLInterface: dossier },
    );

    const page = await app.inject({ method: 'GET', url: '/' });
    const api = await app.inject({ method: 'GET', url: '/api/diagnostics' });

    expect(page.statusCode).toBe(200);
    expect(page.headers['content-type']).toContain('text/html');
    expect(page.body).toContain('Interface de test');
    expect(api.statusCode).toBe(200);
    await app.close();
    rmSync(dossier, { recursive: true, force: true });
  });
});
