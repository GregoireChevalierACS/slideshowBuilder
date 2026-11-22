import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { uneCouleur } from '../testing/fabriques.js';
import { CONTRASTE_MINIMAL, Couleur } from './Couleur.js';

const uneCouleurQuelconque = () =>
  fc
    .tuple(fc.nat(255), fc.nat(255), fc.nat(255))
    .map(([r, v, b]) =>
      uneCouleur(`#${[r, v, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`),
    );

describe('Couleur', () => {
  it('se lit en hexadécimal, majuscules et espaces acceptés', () => {
    expect(Couleur.depuisHex(' #1F5FBF ')).toMatchObject({
      ok: true,
      value: { rouge: 31, vert: 95, bleu: 191, hex: '#1f5fbf' },
    });
  });

  it.each(['1f5fbf', '#1f5fb', '#1f5fbfa', '#1g5fbf', 'x#1f5fbf', 'bleu', ''])(
    'refuse « %s »',
    (valeur) => {
      expect(Couleur.depuisHex(valeur)).toStrictEqual({
        ok: false,
        error: { kind: 'CouleurInvalide', valeur },
      });
    },
  );

  it.each([
    ['#ffffff', 1],
    ['#000000', 21],
    // Le bleu de l'application : 6,09 sur blanc.
    ['#1f5fbf', 6.09],
    // Un gris moyen : 3,95, insuffisant pour du texte.
    ['#808080', 3.95],
    // Une composante très sombre (10 / 255) suit la partie linéaire de la formule : 19,80.
    ['#0a0a0a', 19.8],
  ])('mesure le contraste de %s sur fond blanc : %s', (hex, contraste) => {
    expect(uneCouleur(hex).contrasteSurBlanc).toBeCloseTo(contraste, 2);
  });

  it('garde telle quelle une couleur déjà lisible', () => {
    expect(uneCouleur('#1f5fbf').lisibleSurBlanc().hex).toBe('#1f5fbf');
  });

  it('assombrit par paliers de 5 % une couleur trop claire : le jaune devient brun', () => {
    // #ffd400 × 0,55 = #8c7500 (4,51), premier palier à atteindre 4,5.
    expect(uneCouleur('#ffd400').lisibleSurBlanc().hex).toBe('#8c7500');
    // #808080 × 0,90 = #737373 (4,74).
    expect(uneCouleur('#808080').lisibleSurBlanc().hex).toBe('#737373');
  });

  it('fait du blanc un gris lisible : #ffffff × 0,45 = #737373', () => {
    expect(uneCouleur('#ffffff').lisibleSurBlanc().hex).toBe('#737373');
  });

  it('rend toujours une couleur lisible, de la même teinte', () => {
    fc.assert(
      fc.property(uneCouleurQuelconque(), (couleur) => {
        const lisible = couleur.lisibleSurBlanc();
        return (
          lisible.contrasteSurBlanc >= CONTRASTE_MINIMAL &&
          lisible.rouge <= couleur.rouge &&
          lisible.vert <= couleur.vert &&
          lisible.bleu <= couleur.bleu
        );
      }),
    );
  });
});
