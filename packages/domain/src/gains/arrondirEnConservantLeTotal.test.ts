import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arrondirEnConservantLeTotal } from './arrondirEnConservantLeTotal.js';

const somme = (valeurs: readonly number[]): number => valeurs.reduce((a, b) => a + b, 0);

const arrondir = (valeurs: readonly number[]): number[] =>
  arrondirEnConservantLeTotal(valeurs, (valeur) => valeur).map(({ arrondi }) => arrondi);

const valeursExactes = () =>
  fc.array(fc.double({ min: 0, max: 1e9, noNaN: true, noDefaultInfinity: true }), {
    maxLength: 50,
  });

describe('arrondirEnConservantLeTotal', () => {
  it('ne change pas des valeurs déjà entières', () => {
    expect(arrondir([3, 0, 12])).toStrictEqual([3, 0, 12]);
  });

  it("donne l'unité manquante à la plus grande partie décimale", () => {
    expect(arrondir([0.2, 0.7, 0.3])).toStrictEqual([0, 1, 0]);
  });

  it("ne laisse pas disparaître une unité quand chaque ligne s'arrondirait vers le bas", () => {
    expect(arrondir([0.4, 0.4, 0.4])).toStrictEqual([1, 0, 0]);
  });

  it("départage les ex aequo par l'ordre des lignes, pour rester déterministe", () => {
    expect(arrondir([1.5, 1.5, 1])).toStrictEqual([2, 1, 1]);
  });

  it('répartit plusieurs unités manquantes', () => {
    expect(arrondir([1.6, 2.2, 3.7, 0.5])).toStrictEqual([2, 2, 4, 0]);
  });

  it('accepte une liste vide', () => {
    expect(arrondir([])).toStrictEqual([]);
  });

  it("donne le même total quel que soit l'ordre, même quand la somme tombe sur ,5", () => {
    // Trouvé par fast-check : en virgule flottante, cette somme vaut 26 955 795,5 dans un sens et
    // 26 955 795,499999996 dans l'autre, ce qui changeait le total arrondi d'une unité.
    const valeurs = [1_058_959.98, 3_227.36, 4_352_745.6, 21_540_862.56];

    expect(somme(arrondir([...valeurs].reverse()))).toBe(somme(arrondir(valeurs)));
  });

  it('renvoie chaque élément avec son arrondi, dans l’ordre', () => {
    const lignes = [
      { nom: 'a', centimes: 0.4 },
      { nom: 'b', centimes: 0.6 },
    ];

    expect(arrondirEnConservantLeTotal(lignes, (ligne) => ligne.centimes)).toStrictEqual([
      { element: lignes[0], arrondi: 0 },
      { element: lignes[1], arrondi: 1 },
    ]);
  });

  it('la somme des arrondis vaut toujours l’arrondi de la somme', () => {
    fc.assert(
      fc.property(valeursExactes(), (valeurs) => {
        return somme(arrondir(valeurs)) === Math.round(somme(valeurs));
      }),
    );
  });

  it('chaque arrondi est un entier à moins d’une unité de la valeur exacte', () => {
    fc.assert(
      fc.property(valeursExactes(), (valeurs) => {
        const resultats = arrondirEnConservantLeTotal(valeurs, (valeur) => valeur);
        return (
          resultats.length === valeurs.length &&
          resultats.every(
            ({ element, arrondi }) => Number.isInteger(arrondi) && Math.abs(arrondi - element) < 1,
          )
        );
      }),
    );
  });
});
