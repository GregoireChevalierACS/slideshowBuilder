import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { unOutil, unProfil } from '../testing/fabriques.js';
import { CATALOGUE_DE_BRIQUES, type IdDeBrique } from './Brique.js';
import { concevoirSolution, type SolutionProposee } from './concevoirSolution.js';
import type { ModeDAcces } from './Outil.js';
import type {
  DecisionHumaine,
  FormeDesDonnees,
  NatureDeTache,
  ProfilDAutomatisation,
} from './ProfilDAutomatisation.js';

const ids = (solution: SolutionProposee): IdDeBrique[] => solution.briques.map((b) => b.id);
const familleDe = (solution: SolutionProposee, famille: string): IdDeBrique[] =>
  solution.briques.filter((b) => b.famille === famille).map((b) => b.id);

const NATURES: readonly NatureDeTache[] = [
  'saisie',
  'transfert',
  'generation-de-document',
  'tri',
  'relance',
  'rapprochement',
  'reporting',
  'signature',
  'paiement',
  'prise-de-rendez-vous',
];
const ACCES: readonly ModeDAcces[] = ['api', 'webhook', 'email', 'export', 'aucun'];

const profilArbitraire = (): fc.Arbitrary<ProfilDAutomatisation> =>
  fc
    .record({
      nature: fc.constantFrom(...NATURES),
      accesSource: fc.constantFrom(...ACCES),
      accesCible: fc.constantFrom(...ACCES),
      donnees: fc.constantFrom<FormeDesDonnees>('structurees', 'documents'),
      decisionHumaine: fc.constantFrom<DecisionHumaine>('aucune', 'ponctuelle', 'systematique'),
    })
    .map(({ nature, accesSource, accesCible, donnees, decisionHumaine }) => ({
      nature,
      source: unOutil(accesSource),
      cible: unOutil(accesCible),
      donnees,
      decisionHumaine,
    }));

describe('concevoirSolution', () => {
  describe('déclencheur', () => {
    it.each([
      ['relance', 'planificateur'],
      ['reporting', 'planificateur'],
      ['prise-de-rendez-vous', 'formulaire'],
    ] as const)('une tâche de type « %s » est lancée par : %s', (nature, declencheur) => {
      expect(familleDe(concevoirSolution(unProfil({ nature })), 'declencheur')).toStrictEqual([
        declencheur,
      ]);
    });

    it.each([
      ['webhook', 'webhook'],
      ['email', 'reception-email'],
      ['export', 'depot-de-fichier'],
      ['api', 'planificateur'],
      ['aucun', 'planificateur'],
    ] as const)(
      'un outil source accessible par « %s » déclenche par : %s',
      (acces, declencheur) => {
        const solution = concevoirSolution(unProfil({ source: unOutil(acces) }));

        expect(familleDe(solution, 'declencheur')).toStrictEqual([declencheur]);
      },
    );

    it('une relance reste planifiée même si l’outil source envoie des webhooks', () => {
      const solution = concevoirSolution(
        unProfil({ nature: 'relance', source: unOutil('webhook') }),
      );

      expect(familleDe(solution, 'declencheur')).toStrictEqual(['planificateur']);
    });
  });

  describe('connecteurs', () => {
    it.each([
      ['api', 'api'],
      ['webhook', 'api'],
      ['email', 'boite-mail'],
      ['export', 'import-export-fichiers'],
      ['aucun', 'automatisation-interface'],
    ] as const)('un outil accessible par « %s » se connecte par : %s', (acces, connecteur) => {
      expect(
        familleDe(concevoirSolution(unProfil({ source: unOutil(acces) })), 'connecteur'),
      ).toContain(connecteur);
      expect(
        familleDe(concevoirSolution(unProfil({ cible: unOutil(acces) })), 'connecteur'),
      ).toContain(connecteur);
    });

    it('ne propose qu’une fois un connecteur commun à la source et à la cible', () => {
      expect(familleDe(concevoirSolution(unProfil()), 'connecteur')).toStrictEqual(['api']);
    });

    it('combine les connecteurs de deux outils différents', () => {
      const solution = concevoirSolution(
        unProfil({ source: unOutil('email'), cible: unOutil('export') }),
      );

      expect(familleDe(solution, 'connecteur')).toStrictEqual([
        'boite-mail',
        'import-export-fichiers',
      ]);
    });
  });

  describe('traitements et services selon la nature de la tâche', () => {
    it.each([
      ['saisie', ['transformation-donnees']],
      ['transfert', ['transformation-donnees']],
      ['generation-de-document', ['generation-documents']],
      ['tri', ['classification-ia']],
      ['relance', ['generation-documents']],
      ['rapprochement', ['rapprochement-regles']],
      ['reporting', ['agregation-reporting']],
      ['signature', ['generation-documents', 'signature-electronique']],
      ['paiement', ['rapprochement-regles', 'paiement-en-ligne']],
      ['prise-de-rendez-vous', ['synchronisation-agenda']],
    ] as const)('« %s » : %s', (nature, attendues) => {
      const solution = concevoirSolution(unProfil({ nature }));

      expect([
        ...familleDe(solution, 'traitement'),
        ...familleDe(solution, 'service'),
      ]).toStrictEqual(attendues);
    });

    it('extrait les données des documents (PDF, scans)', () => {
      expect(ids(concevoirSolution(unProfil({ donnees: 'documents' })))).toContain(
        'extraction-documents',
      );
    });

    it('n’extrait rien de données déjà structurées', () => {
      expect(ids(concevoirSolution(unProfil()))).not.toContain('extraction-documents');
    });
  });

  describe('contrôle', () => {
    it('trace et relance toujours les exécutions en erreur', () => {
      expect(familleDe(concevoirSolution(unProfil()), 'controle')).toStrictEqual([
        'journal-reprise',
      ]);
    });

    it('fait valider les exceptions par une personne', () => {
      expect(
        familleDe(concevoirSolution(unProfil({ decisionHumaine: 'ponctuelle' })), 'controle'),
      ).toStrictEqual(['validation-humaine', 'journal-reprise']);
    });

    it('prépare et notifie quand chaque cas demande une décision', () => {
      expect(
        familleDe(concevoirSolution(unProfil({ decisionHumaine: 'systematique' })), 'controle'),
      ).toStrictEqual(['validation-humaine', 'notification', 'journal-reprise']);
    });

    it('notifie les relances envoyées', () => {
      expect(familleDe(concevoirSolution(unProfil({ nature: 'relance' })), 'controle')).toContain(
        'notification',
      );
    });
  });

  describe("niveau d'automatisation et taux suggérés", () => {
    it('automatise complètement un flux structuré entre outils intégrables, sans décision : 70 à 90 %', () => {
      expect(concevoirSolution(unProfil())).toMatchObject({
        niveau: 'complete',
        tauxSuggeres: { bas: { valeur: 70 }, haut: { valeur: 90 } },
      });
    });

    it.each([
      ['des documents à extraire', { donnees: 'documents' }],
      ['une décision ponctuelle', { decisionHumaine: 'ponctuelle' }],
      ['une source sans accès', { source: unOutil('aucun') }],
      ['une cible sans accès', { cible: unOutil('aucun') }],
    ] as const)('assiste seulement avec %s : 40 à 70 %', (_cas, surcharges) => {
      expect(concevoirSolution(unProfil(surcharges))).toMatchObject({
        niveau: 'assistee',
        tauxSuggeres: { bas: { valeur: 40 }, haut: { valeur: 70 } },
      });
    });

    it('se limite à préparer et notifier quand chaque cas demande une décision : 10 à 30 %', () => {
      expect(
        concevoirSolution(unProfil({ decisionHumaine: 'systematique', donnees: 'documents' })),
      ).toMatchObject({
        niveau: 'notification',
        tauxSuggeres: { bas: { valeur: 10 }, haut: { valeur: 30 } },
      });
    });
  });

  describe('justifications', () => {
    it('explique le choix de chaque brique par la règle qui l’a déclenchée', () => {
      const { justifications } = concevoirSolution(
        unProfil({ source: unOutil('webhook'), donnees: 'documents' }),
      );

      expect(justifications).toContainEqual({
        briques: ['webhook'],
        raison: "l'outil source envoie des webhooks",
      });
      expect(justifications).toContainEqual({
        briques: ['extraction-documents'],
        raison: 'les données arrivent sous forme de documents (PDF, scans)',
      });
    });

    it('rédige les justifications d’un transfert simple, dans l’ordre du flux', () => {
      expect(concevoirSolution(unProfil()).justifications).toStrictEqual([
        { briques: ['planificateur'], raison: "l'outil source est consulté à intervalle régulier" },
        {
          briques: ['api'],
          raison: "l'outil source expose une API ou l'outil source envoie des webhooks",
        },
        {
          briques: ['api'],
          raison: "l'outil cible expose une API ou l'outil cible envoie des webhooks",
        },
        {
          briques: ['transformation-donnees'],
          raison: 'la tâche est une saisie ou un transfert entre outils',
        },
        {
          briques: ['journal-reprise'],
          raison: 'chaque exécution doit être tracée et pouvoir être relancée',
        },
      ]);
    });

    it('rédige les justifications d’une relance de documents avec exceptions', () => {
      const solution = concevoirSolution(
        unProfil({
          nature: 'relance',
          source: unOutil('email'),
          cible: unOutil('export'),
          donnees: 'documents',
          decisionHumaine: 'ponctuelle',
        }),
      );

      expect(solution.justifications).toStrictEqual([
        { briques: ['planificateur'], raison: 'la tâche est une relance ou un reporting' },
        { briques: ['boite-mail'], raison: "l'outil source communique par e-mail" },
        { briques: ['import-export-fichiers'], raison: "l'outil cible exporte des fichiers" },
        {
          briques: ['extraction-documents'],
          raison: 'les données arrivent sous forme de documents (PDF, scans)',
        },
        {
          briques: ['generation-documents'],
          raison:
            'la tâche est une génération de document ou une relance ou une signature de documents',
        },
        {
          briques: ['validation-humaine'],
          raison:
            'une décision humaine est nécessaire pour les exceptions ou chaque cas demande une décision humaine',
        },
        {
          briques: ['notification'],
          raison: 'la tâche est une relance ou chaque cas demande une décision humaine',
        },
        {
          briques: ['journal-reprise'],
          raison: 'chaque exécution doit être tracée et pouvoir être relancée',
        },
      ]);
    });

    it.each([
      [{ nature: 'tri' }, 'classification-ia', 'la tâche est un tri'],
      [
        { nature: 'paiement' },
        'rapprochement-regles',
        'la tâche est un rapprochement ou un encaissement',
      ],
      [{ nature: 'paiement' }, 'paiement-en-ligne', 'la tâche est un encaissement'],
      [{ nature: 'reporting' }, 'agregation-reporting', 'la tâche est un reporting'],
      [
        { nature: 'signature' },
        'signature-electronique',
        'la tâche est une signature de documents',
      ],
      [{ nature: 'prise-de-rendez-vous' }, 'formulaire', 'la tâche est une prise de rendez-vous'],
      [{ source: unOutil('email') }, 'reception-email', "l'outil source communique par e-mail"],
      [{ source: unOutil('export') }, 'depot-de-fichier', "l'outil source exporte des fichiers"],
      [
        { source: unOutil('aucun') },
        'automatisation-interface',
        "l'outil source n'offre aucun accès",
      ],
      [{ cible: unOutil('email') }, 'boite-mail', "l'outil cible communique par e-mail"],
      [
        { cible: unOutil('aucun') },
        'automatisation-interface',
        "l'outil cible n'offre aucun accès",
      ],
      [
        { source: unOutil('export') },
        'import-export-fichiers',
        "l'outil source exporte des fichiers",
      ],
    ] as const)('justifie %o → %s par « %s »', (surcharges, id, raison) => {
      const { justifications } = concevoirSolution(unProfil(surcharges));

      expect(justifications).toContainEqual({ briques: [id], raison });
    });

    it('explique le niveau retenu', () => {
      expect(concevoirSolution(unProfil()).raisonDuNiveau).toBe(
        "les données sont structurées, les outils sont intégrables et aucune décision humaine n'est requise",
      );
      expect(concevoirSolution(unProfil({ cible: unOutil('aucun') })).raisonDuNiveau).toBe(
        "l'outil source n'offre aucun accès ou l'outil cible n'offre aucun accès",
      );
      expect(concevoirSolution(unProfil({ decisionHumaine: 'systematique' })).raisonDuNiveau).toBe(
        'chaque cas demande une décision humaine',
      );
    });
  });

  describe('propriétés', () => {
    it('propose toujours exactement un déclencheur et le journal de reprise', () => {
      fc.assert(
        fc.property(profilArbitraire(), (profil) => {
          const solution = concevoirSolution(profil);
          return (
            familleDe(solution, 'declencheur').length === 1 &&
            ids(solution).includes('journal-reprise')
          );
        }),
      );
    });

    it('liste chaque brique une seule fois, dans l’ordre du catalogue', () => {
      fc.assert(
        fc.property(profilArbitraire(), (profil) => {
          const proposees = ids(concevoirSolution(profil));
          const ordreDuCatalogue = CATALOGUE_DE_BRIQUES.map((b) => b.id).filter((id) =>
            proposees.includes(id),
          );
          return JSON.stringify(proposees) === JSON.stringify(ordreDuCatalogue);
        }),
      );
    });

    it('justifie chaque brique, et ne justifie que des briques proposées', () => {
      fc.assert(
        fc.property(profilArbitraire(), (profil) => {
          const solution = concevoirSolution(profil);
          const justifiees = new Set(solution.justifications.flatMap((j) => j.briques));
          return (
            justifiees.size === solution.briques.length &&
            solution.briques.every((b) => justifiees.has(b.id))
          );
        }),
      );
    });

    it("n'annonce jamais d'automatisation complète avec un outil accessible seulement par son interface", () => {
      fc.assert(
        fc.property(profilArbitraire(), (profil) => {
          const solution = concevoirSolution(profil);
          const sansAcces = !profil.source.estIntegrable || !profil.cible.estIntegrable;
          return (
            !sansAcces ||
            (solution.niveau !== 'complete' && ids(solution).includes('automatisation-interface'))
          );
        }),
      );
    });
  });
});
