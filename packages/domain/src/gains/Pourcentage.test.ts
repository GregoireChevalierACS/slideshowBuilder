import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Pourcentage } from './Pourcentage.js';

describe('Pourcentage', () => {
  it('se crée à partir d’un entier entre 0 et 100', () => {
    const pourcentage = Pourcentage.creer(85);

    expect(pourcentage.ok && pourcentage.value.valeur).toBe(85);
  });

  it.each([0, 100])('accepte la borne %s', (valeur) => {
    expect(Pourcentage.creer(valeur).ok).toBe(true);
  });

  it.each([-1, 101])('refuse %s', (valeur) => {
    expect(Pourcentage.creer(valeur)).toStrictEqual({
      ok: false,
      error: { kind: 'PourcentageHorsBornes', valeur },
    });
  });

  it.each([12.5, Number.NaN])('refuse %s', (valeur) => {
    expect(Pourcentage.creer(valeur)).toStrictEqual({
      ok: false,
      error: { kind: 'PourcentageNonEntier', valeur },
    });
  });

  describe('fixé par le domaine (taux par défaut, résultats de calcul)', () => {
    it.each([
      [0, 0],
      [70, 70],
      [100, 100],
      [69.5, 70],
    ])('%s devient %s %', (valeur, attendu) => {
      expect(Pourcentage.arrondi(valeur).valeur).toBe(attendu);
    });

    it.each([-0.6, 100.6, Number.NaN])('signale un bug pour %s %', (valeur) => {
      expect(() => Pourcentage.arrondi(valeur)).toThrow(
        new RangeError(`Pourcentage calculé invalide : ${String(valeur)}`),
      );
    });
  });

  it('conserve exactement tout entier entre 0 et 100', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (valeur) => {
        const pourcentage = Pourcentage.creer(valeur);
        return pourcentage.ok && pourcentage.value.valeur === valeur;
      }),
    );
  });
});
