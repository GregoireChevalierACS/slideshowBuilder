import { describe, expect, it } from 'vitest';
import { apparier } from './apparier.js';

describe('apparier', () => {
  it('associe deux listes élément par élément', () => {
    expect(apparier(['a', 'b'], [1, 2])).toStrictEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('accepte deux listes vides', () => {
    expect(apparier([], [])).toStrictEqual([]);
  });

  it.each([
    [['a', 'b'], [1]],
    [['a'], [1, 2]],
  ])('signale un bug quand les longueurs diffèrent (%j, %j)', (gauche, droite) => {
    expect(() => apparier(gauche, droite)).toThrow(
      new RangeError(
        `Listes de longueurs différentes : ${String(gauche.length)} et ${String(droite.length)}`,
      ),
    );
  });
});
