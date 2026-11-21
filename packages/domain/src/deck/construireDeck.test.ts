import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  unDiagnostic,
  uneOption,
  unOutil,
  unProcessusDuDiagnostic,
  unEffectif,
  valeurDe,
} from '../testing/fabriques.js';
import { construireDeck, NOTE_DU_COUT_PAR_HEURE } from './construireDeck.js';
import type {
  Diapositive,
  DureeDePresentation,
  GenreDeDiapositive,
  ParametresDuDeck,
  PublicVise,
} from './Diapositive.js';

const HEURE = 3_600;

const genres = (deck: readonly Diapositive[]): GenreDeDiapositive[] => deck.map((d) => d.kind);

const diapositive = <K extends GenreDeDiapositive>(
  deck: readonly Diapositive[],
  kind: K,
): Extract<Diapositive, { kind: K }> => {
  const trouvee = deck.find((d): d is Extract<Diapositive, { kind: K }> => d.kind === kind);
  if (trouvee === undefined) throw new Error(`diapositive ${kind} absente`);
  return trouvee;
};

const deuxProcessus = () =>
  unDiagnostic([
    unProcessusDuDiagnostic(
      { nom: 'Relances', dureeEnSecondes: 600, frequence: [15, 'semaine'], personnes: 1 },
      { nature: 'relance' },
    ),
    unProcessusDuDiagnostic({ nom: 'Saisie des factures' }, { donnees: 'documents' }),
  ]);

const complet = (publicVise: PublicVise): ParametresDuDeck => ({
  public: publicVise,
  duree: 'complete',
});

/** Les mêmes processus, avec deux façons de les héberger à comparer. */
const avecDesOptions = () =>
  unDiagnostic(deuxProcessus().processus, { nom: 'Négoce Durand' }, [
    uneOption({ nom: 'Au bureau' }),
    uneOption({ nom: 'Dans le cloud', materiel: 0, fraisMensuels: [80, 120] }),
  ]);

describe('construireDeck', () => {
  describe('options d’hébergement', () => {
    it.each([
      ['dirigeant', 'courte'],
      ['dirigeant', 'complete'],
      ['technique', 'courte'],
      ['technique', 'complete'],
    ] as const)('les compare juste après les gains (%s, %s)', (publicVise, duree) => {
      const deck = genres(construireDeck(avecDesOptions(), { public: publicVise, duree }));

      expect(deck[deck.indexOf('GainsAttendus') + 1]).toBe('Options');
      expect(deck.filter((g) => g === 'Options')).toHaveLength(1);
    });

    it('n’ont pas de diapositive quand aucune n’est saisie', () => {
      expect(genres(construireDeck(deuxProcessus(), complet('technique')))).not.toContain(
        'Options',
      );
    });

    it('sont chiffrées face au temps gagné, avec la méthode dans les notes du présentateur', () => {
      const diagnostic = avecDesOptions();
      const options = diapositive(construireDeck(diagnostic, complet('dirigeant')), 'Options');

      expect(options).toStrictEqual({
        kind: 'Options',
        tempsGagneParAn: diagnostic.estimation.total.tempsGagneParAn,
        options: diagnostic.coutDesOptions,
        notes: [NOTE_DU_COUT_PAR_HEURE],
      });
      // La note explique la formule : de quoi répondre à « d'où vient ce chiffre ? ».
      expect(NOTE_DU_COUT_PAR_HEURE).toContain(
        '(mise en place + matériel + 36 mois de frais) ÷ heures gagnées sur 3 ans',
      );
    });
  });

  describe('sélection et ordre des diapositives', () => {
    it('version complète pour un public technique : une diapositive par processus', () => {
      expect(genres(construireDeck(deuxProcessus(), complet('technique')))).toStrictEqual([
        'Titre',
        'Observation',
        'CoutCache',
        'TableauDesProcessus',
        'Architecture',
        'SolutionDUnProcessus',
        'SolutionDUnProcessus',
        'GainsAttendus',
        'FeuilleDeRoute',
        'Hypotheses',
      ]);
    });

    it('version complète pour un dirigeant : sans le détail par processus', () => {
      expect(genres(construireDeck(deuxProcessus(), complet('dirigeant')))).toStrictEqual([
        'Titre',
        'Observation',
        'CoutCache',
        'TableauDesProcessus',
        'Architecture',
        'GainsAttendus',
        'FeuilleDeRoute',
        'Hypotheses',
      ]);
    });

    it.each(['dirigeant', 'technique'] as const)(
      'version courte pour un public « %s »',
      (publicVise) => {
        expect(
          genres(construireDeck(deuxProcessus(), { public: publicVise, duree: 'courte' })),
        ).toStrictEqual(['Titre', 'CoutCache', 'Architecture', 'GainsAttendus', 'FeuilleDeRoute']);
      },
    );
  });

  describe('contenu', () => {
    it('titre : prospect, date en toutes lettres et version du diagnostic', () => {
      const v2 = valeurDe(deuxProcessus().reviser({}));

      expect(diapositive(construireDeck(v2, complet('dirigeant')), 'Titre')).toStrictEqual({
        kind: 'Titre',
        titre: 'Automatiser vos tâches répétitives',
        prospect: 'Négoce Durand',
        date: '26 octobre 2026',
        version: 2,
        notes: [],
      });
    });

    it('observation : secteur, effectif, outils et processus relevés', () => {
      const diagnostic = unDiagnostic(
        [
          unProcessusDuDiagnostic(
            { nom: 'Relances' },
            {
              source: unOutil('api', 'comptabilite', 'Pennylane'),
              cible: unOutil('email', 'messagerie', 'Outlook'),
            },
          ),
        ],
        { nom: 'Négoce Durand', secteur: 'Négoce', effectifTotal: unEffectif(25) },
      );

      expect(
        diapositive(construireDeck(diagnostic, complet('dirigeant')), 'Observation'),
      ).toMatchObject({
        secteur: 'Négoce',
        effectifTotal: 25,
        outils: [{ nom: 'Pennylane' }, { nom: 'Outlook' }],
        processus: ['Relances'],
      });
    });

    it('observation : sans effectif connu', () => {
      expect(
        diapositive(construireDeck(deuxProcessus(), complet('dirigeant')), 'Observation'),
      ).toMatchObject({
        secteur: undefined,
        effectifTotal: undefined,
      });
    });

    it('coût caché : le temps et l’argent dépensés aujourd’hui', () => {
      const diagnostic = deuxProcessus();
      const { total } = diagnostic.estimation;

      expect(
        diapositive(construireDeck(diagnostic, complet('dirigeant')), 'CoutCache'),
      ).toStrictEqual({
        kind: 'CoutCache',
        tempsActuelParAn: total.tempsActuelParAn,
        valeurActuelleParAn: total.valeurActuelleParAn,
        equivalentsTempsPleinActuels: total.equivalentsTempsPleinActuels,
        nombreDeProcessus: 2,
        notes: [],
      });
      // 600 s × 15 × 45,6 semaines = 114 h, plus la saisie de référence : 608 h
      expect(total.tempsActuelParAn.enSecondes).toBe(722 * HEURE);
    });

    it('tableau des processus : les lignes et le total de l’estimation', () => {
      const diagnostic = deuxProcessus();

      expect(
        diapositive(construireDeck(diagnostic, complet('dirigeant')), 'TableauDesProcessus'),
      ).toStrictEqual({
        kind: 'TableauDesProcessus',
        lignes: diagnostic.estimation.parProcessus,
        total: diagnostic.estimation.total,
        notes: [],
      });
    });

    it.each([
      ['dirigeant', 'familles'],
      ['technique', 'briques'],
    ] as const)('architecture pour un public « %s » : détail par %s', (publicVise, detail) => {
      const diagnostic = deuxProcessus();
      const { architecture } = diagnostic;

      expect(
        diapositive(construireDeck(diagnostic, complet(publicVise)), 'Architecture'),
      ).toStrictEqual({
        kind: 'Architecture',
        detail,
        outils: architecture.outils,
        briques: architecture.briques,
        utiliseIA: true,
        notes: [],
      });
    });

    it('solution de chaque processus, dans l’ordre de saisie', () => {
      const diagnostic = deuxProcessus();
      const solutions = construireDeck(diagnostic, complet('technique')).filter(
        (d) => d.kind === 'SolutionDUnProcessus',
      );

      expect(solutions).toStrictEqual(
        diagnostic.architecture.solutions.map(({ nom, solution }) => ({
          kind: 'SolutionDUnProcessus',
          processus: nom,
          solution,
          notes: [],
        })),
      );
    });

    it('gains attendus : le total et la valeur de chaque processus', () => {
      const diagnostic = deuxProcessus();
      const gains = diapositive(construireDeck(diagnostic, complet('dirigeant')), 'GainsAttendus');

      expect(gains.total).toStrictEqual(diagnostic.estimation.total);
      expect(gains.parProcessus).toStrictEqual(
        diagnostic.estimation.parProcessus.map((ligne) => ({
          processus: ligne.processus.nom,
          valeurGagneeParAn: ligne.valeurGagneeParAn,
        })),
      );
    });

    it('feuille de route : les gains rapides d’abord', () => {
      // La relance est complète, la saisie de documents seulement assistée, malgré sa valeur plus élevée.
      const { chantiers } = diapositive(
        construireDeck(deuxProcessus(), complet('dirigeant')),
        'FeuilleDeRoute',
      );

      expect(chantiers.map((c) => [c.rang, c.nom, c.niveau])).toStrictEqual([
        [1, 'Relances', 'complete'],
        [2, 'Saisie des factures', 'assistee'],
      ]);
    });

    it('hypothèses : calendrier et coût horaire de chaque processus', () => {
      const diagnostic = deuxProcessus();
      const hypotheses = diapositive(
        construireDeck(diagnostic, complet('dirigeant')),
        'Hypotheses',
      );

      expect(hypotheses.hypotheses).toBe(diagnostic.hypotheses);
      expect(hypotheses.coutsHoraires).toStrictEqual(
        diagnostic.processus.map(({ processus }) => ({
          processus: processus.nom,
          coutHoraire: processus.coutHoraire,
        })),
      );
    });
  });

  describe('alertes de cohérence', () => {
    const avecUneAlerte = () =>
      unDiagnostic([
        unProcessusDuDiagnostic({
          nom: 'Tri du courrier',
          dureeEnSecondes: 8 * HEURE,
          frequence: [1, 'jour'],
        }),
      ]);

    it('les signale au présentateur dès la diapositive de titre', () => {
      expect(
        diapositive(construireDeck(avecUneAlerte(), complet('dirigeant')), 'Titre').notes,
      ).toStrictEqual([
        'À vérifier avant de présenter : « Tri du courrier » représenterait 1824 h par personne et par an, plus qu’un temps plein (1607 h). La fréquence a peut-être été saisie pour toute l’équipe au lieu d’une personne.',
      ]);
    });

    it('ne les montre jamais au client', () => {
      const deck = construireDeck(avecUneAlerte(), complet('technique'));
      const visibleParLeClient = JSON.stringify(deck.map((d) => ({ ...d, notes: [] })));

      expect(visibleParLeClient).not.toContain('vérifier');
    });
  });

  describe('propriétés', () => {
    const parametres = () =>
      fc.record({
        public: fc.constantFrom<PublicVise>('dirigeant', 'technique'),
        duree: fc.constantFrom<DureeDePresentation>('courte', 'complete'),
      });

    it('même diagnostic, mêmes options et mêmes paramètres : même deck', () => {
      fc.assert(
        fc.property(parametres(), fc.boolean(), (p, options) => {
          const diagnostic = options ? avecDesOptions : deuxProcessus;
          return (
            JSON.stringify(construireDeck(diagnostic(), p)) ===
            JSON.stringify(construireDeck(diagnostic(), p))
          );
        }),
      );
    });

    it('commence toujours par le titre, et la version courte est extraite de la complète', () => {
      fc.assert(
        fc.property(parametres(), (p) => {
          const deck = genres(construireDeck(deuxProcessus(), p));
          const complete = genres(construireDeck(deuxProcessus(), { ...p, duree: 'complete' }));
          return deck[0] === 'Titre' && deck.every((genre) => complete.includes(genre));
        }),
      );
    });
  });
});
