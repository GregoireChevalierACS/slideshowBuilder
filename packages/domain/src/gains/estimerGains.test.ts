import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  desHypotheses,
  unMontant,
  unProcessus,
  type DescriptionDeProcessus,
} from '../testing/fabriques.js';
import { CoutHoraire } from './CoutHoraire.js';
import { estimerGains, type EstimationDeGains } from './estimerGains.js';
import type { Periode } from './Frequence.js';

const HEURE = 3_600;

const descriptionArbitraire = (): fc.Arbitrary<DescriptionDeProcessus> =>
  fc
    .record({
      dureeEnSecondes: fc.integer({ min: 1, max: 4 * HEURE }),
      nombre: fc.integer({ min: 1, max: 50 }),
      periode: fc.constantFrom<Periode>('jour', 'semaine', 'mois', 'an'),
      personnes: fc.integer({ min: 1, max: 200 }),
      taux: fc.tuple(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 })),
      centimesParHeure: fc.integer({ min: 0, max: 20_000 }),
    })
    .map(({ dureeEnSecondes, nombre, periode, personnes, taux, centimesParHeure }) => ({
      dureeEnSecondes,
      frequence: [nombre, periode] as const,
      personnes,
      tauxBas: Math.min(...taux),
      tauxHaut: Math.max(...taux),
      coutHoraire: CoutHoraire.direct(unMontant(centimesParHeure)),
    }));

const estimer = (descriptions: readonly DescriptionDeProcessus[]): EstimationDeGains =>
  estimerGains(descriptions.map(unProcessus), desHypotheses());

describe('estimerGains', () => {
  describe('pour la saisie des factures fournisseurs (4 min × 20 par jour × 2 personnes, 70 à 90 %, 35 €/h)', () => {
    it('chiffre le temps passé aujourd’hui : 240 s × 20 × 228 jours × 2 personnes = 608 h', () => {
      const [ligne] = estimer([{}]).parProcessus;

      expect(ligne?.tempsActuelParAn.enSecondes).toBe(608 * HEURE);
    });

    it('chiffre le temps gagné : 70 % et 90 % de 608 h', () => {
      const [ligne] = estimer([{}]).parProcessus;

      expect(ligne?.tempsGagneParAn.bas.enSecondes).toBe(1_532_160);
      expect(ligne?.tempsGagneParAn.haut.enSecondes).toBe(1_969_920);
    });

    it('valorise le temps gagné au coût horaire : 425,6 h et 547,2 h × 35 €', () => {
      const [ligne] = estimer([{}]).parProcessus;

      expect(ligne?.valeurGagneeParAn.bas.enCentimes).toBe(1_489_600);
      expect(ligne?.valeurGagneeParAn.haut.enCentimes).toBe(1_915_200);
    });

    it('rattache chaque ligne à son processus', () => {
      const [ligne] = estimer([{}]).parProcessus;

      expect(ligne?.processus.nom).toBe('Saisie des factures fournisseurs');
    });

    it('convertit le temps gagné en équivalents temps plein, en centièmes : 425,6 h et 547,2 h / 1 607 h', () => {
      expect(estimer([{}]).total.equivalentsTempsPleinLiberes).toStrictEqual({ bas: 26, haut: 34 });
    });

    it('chiffre le coût du temps passé aujourd’hui : 608 h × 35 € = 21 280 €', () => {
      const { parProcessus, total } = estimer([{}]);

      expect(parProcessus[0]?.valeurActuelleParAn.enCentimes).toBe(2_128_000);
      expect(total.valeurActuelleParAn.enCentimes).toBe(2_128_000);
    });

    it('convertit le temps passé aujourd’hui en équivalents temps plein : 608 h / 1 607 h = 0,38', () => {
      expect(estimer([{}]).total.equivalentsTempsPleinActuels).toBe(38);
    });
  });

  it('valorise au coût déduit du salaire : 40 000 € brut × 1,45 / 1 607 h', () => {
    const coutHoraire = CoutHoraire.depuisSalaireBrutAnnuel(unMontant(4_000_000), 145);
    if (!coutHoraire.ok) throw new Error('coût de test invalide');

    const [ligne] = estimer([
      {
        dureeEnSecondes: HEURE,
        frequence: [1, 'an'],
        personnes: 1,
        tauxBas: 100,
        tauxHaut: 100,
        coutHoraire: coutHoraire.value,
      },
    ]).parProcessus;

    // 5 800 000 c / 1 607 h = 3 609,21… c pour une heure gagnée
    expect(ligne?.valeurGagneeParAn.bas.enCentimes).toBe(3_609);
  });

  it('additionne les processus dans le total', () => {
    const { total } = estimer([
      {},
      { dureeEnSecondes: 600, frequence: [15, 'semaine'], personnes: 1 },
    ]);

    // 608 h + 600 s × 15 × 45,6 semaines = 608 h + 114 h
    expect(total.tempsActuelParAn.enSecondes).toBe(722 * HEURE);
  });

  it('donne un total nul sans processus', () => {
    expect(estimer([])).toMatchObject({
      parProcessus: [],
      total: {
        tempsActuelParAn: { enSecondes: 0 },
        tempsGagneParAn: { bas: { enSecondes: 0 }, haut: { enSecondes: 0 } },
        valeurGagneeParAn: { bas: { enCentimes: 0 }, haut: { enCentimes: 0 } },
        valeurActuelleParAn: { enCentimes: 0 },
        equivalentsTempsPleinLiberes: { bas: 0, haut: 0 },
        equivalentsTempsPleinActuels: 0,
      },
      alertes: [],
    });
  });

  it('garde les hypothèses utilisées, pour les afficher avec les chiffres', () => {
    const hypotheses = desHypotheses(218, 1_600);

    expect(estimerGains([], hypotheses).hypotheses).toBe(hypotheses);
  });

  describe('alertes de cohérence', () => {
    it('signale une personne qui passerait plus d’un temps plein par an sur une seule tâche', () => {
      // 8 h × 228 jours = 1 824 h par personne > 1 607 h : sans doute un volume d'équipe saisi par personne
      const { alertes } = estimer([
        {
          nom: 'Tri du courrier',
          dureeEnSecondes: 8 * HEURE,
          frequence: [1, 'jour'],
          personnes: 3,
        },
      ]);

      expect(alertes).toStrictEqual([
        {
          kind: 'TempsParPersonneSuperieurAuTempsPlein',
          processus: 'Tri du courrier',
          heuresParPersonneParAn: 1_824,
        },
      ]);
    });

    it('accepte une tâche qui occupe exactement un temps plein', () => {
      expect(
        estimer([{ dureeEnSecondes: 1_607 * HEURE, frequence: [1, 'an'] }]).alertes,
      ).toStrictEqual([]);
    });

    it('signale une tâche qui dépasse le temps plein d’une seconde', () => {
      expect(
        estimer([{ dureeEnSecondes: 1_607 * HEURE + 1, frequence: [1, 'an'] }]).alertes,
      ).toHaveLength(1);
    });
  });

  describe('propriétés', () => {
    const plusieursProcessus = () => fc.array(descriptionArbitraire(), { maxLength: 8 });

    it('la somme des lignes affichées vaut toujours le total affiché', () => {
      fc.assert(
        fc.property(plusieursProcessus(), (descriptions) => {
          const { parProcessus, total } = estimer(descriptions);
          const somme = (valeur: (ligne: (typeof parProcessus)[number]) => number) =>
            parProcessus.reduce((acc, ligne) => acc + valeur(ligne), 0);
          return (
            somme((l) => l.tempsActuelParAn.enSecondes) === total.tempsActuelParAn.enSecondes &&
            somme((l) => l.tempsGagneParAn.bas.enSecondes) ===
              total.tempsGagneParAn.bas.enSecondes &&
            somme((l) => l.tempsGagneParAn.haut.enSecondes) ===
              total.tempsGagneParAn.haut.enSecondes &&
            somme((l) => l.valeurGagneeParAn.bas.enCentimes) ===
              total.valeurGagneeParAn.bas.enCentimes &&
            somme((l) => l.valeurGagneeParAn.haut.enCentimes) ===
              total.valeurGagneeParAn.haut.enCentimes &&
            somme((l) => l.valeurActuelleParAn.enCentimes) === total.valeurActuelleParAn.enCentimes
          );
        }),
      );
    });

    it('l’estimation basse ne dépasse jamais la haute, ni le gain le temps passé aujourd’hui', () => {
      fc.assert(
        fc.property(descriptionArbitraire(), (description) => {
          const { total } = estimer([description]);
          return (
            total.tempsGagneParAn.bas.enSecondes <= total.tempsGagneParAn.haut.enSecondes &&
            total.tempsGagneParAn.haut.enSecondes <= total.tempsActuelParAn.enSecondes &&
            total.valeurGagneeParAn.bas.enCentimes <= total.valeurGagneeParAn.haut.enCentimes &&
            total.valeurGagneeParAn.haut.enCentimes <= total.valeurActuelleParAn.enCentimes &&
            total.equivalentsTempsPleinLiberes.bas <= total.equivalentsTempsPleinLiberes.haut &&
            total.equivalentsTempsPleinLiberes.haut <= total.equivalentsTempsPleinActuels
          );
        }),
      );
    });

    it('le gain croît avec le nombre de personnes impactées', () => {
      fc.assert(
        fc.property(descriptionArbitraire(), (description) => {
          const personnes = description.personnes ?? 1;
          const avant = estimer([description]).total.tempsActuelParAn.enSecondes;
          const apres = estimer([{ ...description, personnes: personnes + 1 }]).total
            .tempsActuelParAn.enSecondes;
          return apres > avant;
        }),
      );
    });

    it('doubler l’effectif double le temps, à l’arrondi près', () => {
      fc.assert(
        fc.property(descriptionArbitraire(), (description) => {
          const personnes = description.personnes ?? 1;
          const simple = estimer([description]).total.tempsActuelParAn.enSecondes;
          const double = estimer([{ ...description, personnes: personnes * 2 }]).total
            .tempsActuelParAn.enSecondes;
          return Math.abs(double - 2 * simple) <= 1;
        }),
      );
    });

    it('le total ne dépend pas de l’ordre de saisie des processus', () => {
      fc.assert(
        fc.property(plusieursProcessus(), (descriptions) => {
          const endroit = estimer(descriptions).total;
          const envers = estimer([...descriptions].reverse()).total;
          return JSON.stringify(endroit) === JSON.stringify(envers);
        }),
      );
    });

    it('un taux de 0 % ne gagne rien, un taux de 100 % supprime tout le temps passé', () => {
      fc.assert(
        fc.property(descriptionArbitraire(), (description) => {
          const rien = estimer([{ ...description, tauxBas: 0, tauxHaut: 0 }]).total;
          const tout = estimer([{ ...description, tauxBas: 100, tauxHaut: 100 }]).total;
          return (
            rien.tempsGagneParAn.haut.enSecondes === 0 &&
            rien.valeurGagneeParAn.haut.enCentimes === 0 &&
            tout.tempsGagneParAn.bas.enSecondes === tout.tempsActuelParAn.enSecondes
          );
        }),
      );
    });
  });
});
