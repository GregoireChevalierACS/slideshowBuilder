import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Montant } from './Montant.js';

describe('Montant', () => {
  it('se crée en centimes', () => {
    const montant = Montant.depuisCentimes(4_550);

    expect(montant.ok && montant.value.enCentimes).toBe(4_550);
  });

  it('accepte un montant nul', () => {
    expect(Montant.depuisCentimes(0).ok).toBe(true);
  });

  it('refuse un montant négatif', () => {
    expect(Montant.depuisCentimes(-1)).toStrictEqual({
      ok: false,
      error: { kind: 'MontantNegatif', valeur: -1 },
    });
  });

  it.each([10.5, Number.NaN, Number.POSITIVE_INFINITY])('refuse %s centime(s)', (valeur) => {
    expect(Montant.depuisCentimes(valeur)).toStrictEqual({
      ok: false,
      error: { kind: 'MontantNonEntier', valeur },
    });
  });

  describe('arrondi depuis un calcul', () => {
    it.each([
      [1.4, 1],
      [1.5, 2],
      [0, 0],
    ])('arrondit %s centime(s) à %s', (centimesExacts, attendu) => {
      expect(Montant.arrondi(centimesExacts).enCentimes).toBe(attendu);
    });

    it.each([-0.1, Number.NaN, Number.POSITIVE_INFINITY])(
      'signale un bug de calcul pour %s centime(s)',
      (centimesExacts) => {
        expect(() => Montant.arrondi(centimesExacts)).toThrow(
          new RangeError(`Montant calculé invalide : ${String(centimesExacts)} centimes`),
        );
      },
    );
  });

  it('conserve exactement tout nombre entier positif de centimes', () => {
    fc.assert(
      fc.property(fc.nat(), (centimes) => {
        const montant = Montant.depuisCentimes(centimes);
        return montant.ok && montant.value.enCentimes === centimes;
      }),
    );
  });
});
