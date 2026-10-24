import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Duree } from './Duree.js';

describe('Duree', () => {
  it('se crée en secondes', () => {
    const duree = Duree.depuisSecondes(90);

    expect(duree.ok && duree.value.enSecondes).toBe(90);
  });

  it('se crée en minutes entières', () => {
    const duree = Duree.depuisMinutes(2);

    expect(duree.ok && duree.value.enSecondes).toBe(120);
  });

  it('accepte une durée nulle', () => {
    expect(Duree.depuisSecondes(0).ok).toBe(true);
  });

  it('refuse une durée négative', () => {
    expect(Duree.depuisSecondes(-1)).toStrictEqual({
      ok: false,
      error: { kind: 'DureeNegative', valeur: -1 },
    });
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])('refuse %s seconde(s)', (valeur) => {
    expect(Duree.depuisSecondes(valeur)).toStrictEqual({
      ok: false,
      error: { kind: 'DureeNonEntiere', valeur },
    });
  });

  it("refuse une durée en minutes qui ne tombe pas sur une seconde entière (pas d'arrondi caché)", () => {
    expect(Duree.depuisMinutes(0.01)).toStrictEqual({
      ok: false,
      error: { kind: 'DureeNonEntiere', valeur: 0.6 },
    });
  });

  it('conserve exactement tout nombre entier positif de secondes', () => {
    fc.assert(
      fc.property(fc.nat(), (secondes) => {
        const duree = Duree.depuisSecondes(secondes);
        return duree.ok && duree.value.enSecondes === secondes;
      }),
    );
  });
});
