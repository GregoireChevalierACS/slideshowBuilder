import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { specification } from './Specification.js';

const estPair = () => specification<number>('est pair', (n) => n % 2 === 0);
const estPositif = () => specification<number>('est positif', (n) => n > 0);

describe('Specification', () => {
  it('dit si un candidat la satisfait', () => {
    expect(estPair().estSatisfaitePar(4)).toBe(true);
    expect(estPair().estSatisfaitePar(3)).toBe(false);
  });

  it('se décrit en langage métier', () => {
    expect(estPair().description).toBe('est pair');
  });

  describe('et', () => {
    it('exige les deux', () => {
      const spec = estPair().et(estPositif());

      expect([4, -4, 3].map((n) => spec.estSatisfaitePar(n))).toStrictEqual([true, false, false]);
    });

    it('se lit comme une phrase', () => {
      expect(estPair().et(estPositif()).description).toBe('est pair et est positif');
    });
  });

  describe('ou', () => {
    it("se contente de l'une des deux", () => {
      const spec = estPair().ou(estPositif());

      expect([4, 3, -4, -3].map((n) => spec.estSatisfaitePar(n))).toStrictEqual([
        true,
        true,
        true,
        false,
      ]);
    });

    it('se lit comme une phrase', () => {
      expect(estPair().ou(estPositif()).description).toBe('est pair ou est positif');
    });
  });

  describe('non', () => {
    it('inverse la règle', () => {
      expect(estPair().non().estSatisfaitePar(3)).toBe(true);
      expect(estPair().non().estSatisfaitePar(4)).toBe(false);
    });

    it('se lit comme une phrase', () => {
      expect(estPair().non().description).toBe('non (est pair)');
    });
  });

  it('met entre parenthèses les compositions imbriquées, pour lever toute ambiguïté', () => {
    const spec = estPair().ou(estPositif()).et(estPair().non());

    expect(spec.description).toBe('(est pair ou est positif) et non (est pair)');
  });

  it('met aussi entre parenthèses une conjonction imbriquée', () => {
    const spec = estPair().et(estPositif()).ou(estPair());

    expect(spec.description).toBe('(est pair et est positif) ou est pair');
  });

  it('suit les lois de De Morgan', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        const nonEt = estPair().et(estPositif()).non().estSatisfaitePar(n);
        const ouDesNon = estPair().non().ou(estPositif().non()).estSatisfaitePar(n);
        return nonEt === ouDesNon;
      }),
    );
  });
});
