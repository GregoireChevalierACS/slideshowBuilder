import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Effectif } from './Effectif.js';

describe('Effectif', () => {
  it('compte les personnes impactées', () => {
    const effectif = Effectif.creer(12);

    expect(effectif.ok && effectif.value.personnes).toBe(12);
  });

  it('accepte une seule personne', () => {
    expect(Effectif.creer(1).ok).toBe(true);
  });

  it.each([0, -3])('refuse %s personne(s)', (valeur) => {
    expect(Effectif.creer(valeur)).toStrictEqual({
      ok: false,
      error: { kind: 'EffectifInferieurAUn', valeur },
    });
  });

  it.each([2.5, Number.NaN])('refuse %s personne(s)', (valeur) => {
    expect(Effectif.creer(valeur)).toStrictEqual({
      ok: false,
      error: { kind: 'EffectifNonEntier', valeur },
    });
  });

  it('conserve exactement tout effectif entier strictement positif', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1 }), (personnes) => {
        const effectif = Effectif.creer(personnes);
        return effectif.ok && effectif.value.personnes === personnes;
      }),
    );
  });
});
