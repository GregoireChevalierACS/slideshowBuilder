import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { valeurDe } from '../testing/fabriques.js';
import { Frequence, type Periode, type PeriodeSaisonniere } from './Frequence.js';
import { HypothesesDeCalcul } from './HypothesesDeCalcul.js';

const desHypotheses = (semainesDePointe = 0, joursTravaillesParAn = 228) =>
  valeurDe(
    HypothesesDeCalcul.creer({
      joursTravaillesParAn,
      heuresAnnuellesTempsPlein: 1_607,
      semainesDePointe,
    }),
  );

const occurrencesParAn = (
  nombre: number,
  periode: Periode,
  hypotheses = HypothesesDeCalcul.parDefaut(),
) => valeurDe(Frequence.creer(nombre, periode)).occurrencesParAn(hypotheses);

const occurrencesSaisonnieres = (
  enSaison: number,
  horsSaison: number,
  periode: PeriodeSaisonniere,
  hypotheses = desHypotheses(13),
) => valeurDe(Frequence.saisonniere(enSaison, horsSaison, periode)).occurrencesParAn(hypotheses);

/** Un nombre à une décimale au plus, de 0,1 à 1 000. */
const unNombreAuDixieme = () => fc.integer({ min: 1, max: 10_000 }).map((n) => n / 10);

describe('Frequence', () => {
  describe('régulière', () => {
    it('ramène une fréquence quotidienne aux jours travaillés', () => {
      expect(occurrencesParAn(20, 'jour')).toBe(20 * 228);
    });

    it('ramène une fréquence hebdomadaire aux semaines travaillées (jours travaillés / 5)', () => {
      expect(occurrencesParAn(15, 'semaine')).toBe(684);
    });

    it('ramène une fréquence mensuelle à 12 mois', () => {
      expect(occurrencesParAn(2, 'mois')).toBe(24);
    });

    it('garde une fréquence annuelle telle quelle', () => {
      expect(occurrencesParAn(3, 'an')).toBe(3);
    });

    it('suit les jours travaillés propres au client', () => {
      expect(occurrencesParAn(1, 'jour', desHypotheses(0, 218))).toBe(218);
    });

    it.each([
      [1.5, 'semaine', 68.4],
      [0.5, 'jour', 114],
      [2.5, 'mois', 30],
      [0.1, 'an', 0.1],
    ] as const)('accepte une décimale : %s fois par %s', (nombre, periode, attendu) => {
      expect(occurrencesParAn(nombre, periode)).toBeCloseTo(attendu, 10);
    });

    it('expose le nombre et la période saisis', () => {
      const frequence = valeurDe(Frequence.creer(4, 'semaine'));

      expect(frequence.repartition).toStrictEqual({
        kind: 'Reguliere',
        nombre: 4,
        periode: 'semaine',
      });
      expect(frequence.periode).toBe('semaine');
    });

    it('ignore les semaines de pointe', () => {
      expect(occurrencesParAn(20, 'jour', desHypotheses(13))).toBe(20 * 228);
    });

    it('refuse zéro fois', () => {
      expect(Frequence.creer(0, 'jour')).toStrictEqual({
        ok: false,
        error: { kind: 'FrequenceNulle' },
      });
    });

    it.each([-2, -0.1])('refuse %s fois', (nombre) => {
      expect(Frequence.creer(nombre, 'jour')).toStrictEqual({
        ok: false,
        error: { kind: 'FrequenceNegative', valeur: nombre },
      });
    });

    it.each([1.25, 0.01, Number.NaN, Number.POSITIVE_INFINITY])(
      'refuse %s fois, trop précis ou pas un nombre',
      (nombre) => {
        expect(Frequence.creer(nombre, 'jour')).toStrictEqual({
          ok: false,
          error: { kind: 'FrequenceTropPrecise', valeur: nombre },
        });
      },
    );

    it('accepte toute valeur à une décimale, même mal représentée en virgule flottante (2,3)', () => {
      fc.assert(fc.property(unNombreAuDixieme(), (nombre) => Frequence.creer(nombre, 'jour').ok));
      expect(Frequence.creer(2.3, 'jour').ok).toBe(true);
    });

    it('cinq fois la même tâche par semaine équivaut à une fois par jour travaillé', () => {
      fc.assert(
        fc.property(unNombreAuDixieme(), (nombre) => {
          return occurrencesParAn(nombre * 5, 'semaine') === occurrencesParAn(nombre, 'jour');
        }),
      );
    });
  });

  describe('saisonnière', () => {
    // 13 semaines de pointe : 65 jours en saison, 228 − 65 = 163 jours hors saison.

    it('compte les jours en saison et hors saison : 20 × 65 + 8 × 163 = 2 604 par an', () => {
      expect(occurrencesSaisonnieres(20, 8, 'jour')).toBe(2_604);
    });

    it('compte les semaines : 12 × 13 + 3 × 32,6 = 253,8 par an', () => {
      expect(occurrencesSaisonnieres(12, 3, 'semaine')).toBeCloseTo(253.8, 10);
    });

    it('accepte une décimale : 4 × 13 + 1,5 × 32,6 = 100,9 par an', () => {
      expect(occurrencesSaisonnieres(4, 1.5, 'semaine')).toBeCloseTo(100.9, 10);
    });

    it('accepte une activité qui n’existe qu’en saison : 10 × 13 = 130 par an', () => {
      expect(occurrencesSaisonnieres(10, 0, 'semaine')).toBe(130);
    });

    it('sans semaine de pointe, seule la fréquence hors saison compte', () => {
      expect(occurrencesSaisonnieres(20, 8, 'jour', desHypotheses(0))).toBe(8 * 228);
    });

    it('expose les deux valeurs et la période', () => {
      expect(valeurDe(Frequence.saisonniere(8, 2, 'semaine')).repartition).toStrictEqual({
        kind: 'Saisonniere',
        enSaison: 8,
        horsSaison: 2,
        periode: 'semaine',
      });
    });

    it('refuse zéro fois en saison comme hors saison', () => {
      expect(Frequence.saisonniere(0, 0, 'jour')).toStrictEqual({
        ok: false,
        error: { kind: 'FrequenceNulle' },
      });
    });

    it.each([
      [-1, 2, { kind: 'FrequenceNegative', valeur: -1 }],
      [2, -1, { kind: 'FrequenceNegative', valeur: -1 }],
      [1.25, 2, { kind: 'FrequenceTropPrecise', valeur: 1.25 }],
      [2, 1.25, { kind: 'FrequenceTropPrecise', valeur: 1.25 }],
    ])('refuse %s en saison et %s hors saison', (enSaison, horsSaison, error) => {
      expect(Frequence.saisonniere(enSaison, horsSaison, 'semaine')).toStrictEqual({
        ok: false,
        error,
      });
    });

    it('donne exactement la fréquence régulière quand les deux valeurs sont égales', () => {
      fc.assert(
        fc.property(
          unNombreAuDixieme(),
          fc.constantFrom<PeriodeSaisonniere>('jour', 'semaine'),
          fc.integer({ min: 1, max: 366 }),
          fc.integer({ min: 0, max: 73 }),
          (nombre, periode, jours, semaines) => {
            const hypotheses = desHypotheses(Math.min(semaines, Math.floor(jours / 5)), jours);
            return (
              occurrencesSaisonnieres(nombre, nombre, periode, hypotheses) ===
              occurrencesParAn(nombre, periode, hypotheses)
            );
          },
        ),
      );
    });

    it('ne dépend que de la valeur hors saison sans semaine de pointe', () => {
      fc.assert(
        fc.property(unNombreAuDixieme(), unNombreAuDixieme(), (enSaison, horsSaison) => {
          return (
            occurrencesSaisonnieres(enSaison, horsSaison, 'jour', desHypotheses(0)) ===
            occurrencesParAn(horsSaison, 'jour')
          );
        }),
      );
    });
  });
});
