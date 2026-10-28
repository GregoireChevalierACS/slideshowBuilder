import { describe, expect, it } from 'vitest';
import {
  ACTIONS_CLAVIER,
  chargerLesRaccourcis,
  conflits,
  correspond,
  depuisEvenement,
  enregistrerLesRaccourcis,
  libelle,
  RACCOURCIS_PAR_DEFAUT,
  type Raccourci,
} from './raccourcis.js';

const touche = (
  key: string,
  modificateurs: Partial<Record<'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {},
) => ({
  key,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...modificateurs,
});

const raccourci = (r: Partial<Raccourci> & { touche: string }): Raccourci => ({
  ctrl: false,
  alt: false,
  maj: false,
  ...r,
});

const stockage = (contenu: Record<string, string> = {}) => ({
  contenu,
  getItem: (cle: string) => contenu[cle] ?? null,
  setItem: (cle: string, valeur: string) => {
    contenu[cle] = valeur;
  },
});

describe('raccourcis clavier', () => {
  it('proposent les raccourcis validés par défaut', () => {
    expect(
      Object.fromEntries(ACTIONS_CLAVIER.map((a) => [a, libelle(RACCOURCIS_PAR_DEFAUT[a])])),
    ).toStrictEqual({
      nouveauDiagnostic: 'N',
      nouveauProcessus: 'Alt+N',
      processusPrecedent: 'Alt+↑',
      processusSuivant: 'Alt+↓',
      sectionSuivante: 'Ctrl+Entrée',
    });
  });

  describe('libelle', () => {
    it.each([
      [raccourci({ touche: 'p', ctrl: true, alt: true, maj: true }), 'Ctrl+Alt+Maj+P'],
      [raccourci({ touche: 'ArrowLeft' }), '←'],
      [raccourci({ touche: 'ArrowRight' }), '→'],
      [raccourci({ touche: 'Escape' }), 'Échap'],
      [raccourci({ touche: ' ' }), 'Espace'],
      [raccourci({ touche: 'F2' }), 'F2'],
    ])('%o s’affiche « %s »', (r, attendu) => {
      expect(libelle(r)).toBe(attendu);
    });
  });

  describe('correspond', () => {
    it('reconnaît la touche et exactement ses modificateurs', () => {
      const altN = raccourci({ touche: 'n', alt: true });

      expect(correspond(touche('n', { altKey: true }), altN)).toBe(true);
      expect(correspond(touche('N', { altKey: true }), altN)).toBe(true);
      expect(correspond(touche('n'), altN)).toBe(false);
      expect(correspond(touche('n', { altKey: true, ctrlKey: true }), altN)).toBe(false);
      expect(correspond(touche('n', { altKey: true, shiftKey: true }), altN)).toBe(false);
      expect(correspond(touche('m', { altKey: true }), altN)).toBe(false);
    });
  });

  describe('depuisEvenement', () => {
    it('capture la combinaison tapée dans les paramètres', () => {
      expect(depuisEvenement(touche('K', { ctrlKey: true, shiftKey: true }))).toStrictEqual(
        raccourci({ touche: 'k', ctrl: true, maj: true }),
      );
    });

    it('garde la casse des touches nommées', () => {
      expect(depuisEvenement(touche('ArrowUp', { altKey: true }))).toStrictEqual(
        raccourci({ touche: 'ArrowUp', alt: true }),
      );
    });

    it.each(['Control', 'Alt', 'Shift', 'Meta'])(
      'attend la suite quand seul « %s » est enfoncé',
      (key) => {
        expect(depuisEvenement(touche(key))).toBeUndefined();
      },
    );
  });

  describe('conflits', () => {
    it('ne voit aucun conflit dans les valeurs par défaut', () => {
      expect(conflits(RACCOURCIS_PAR_DEFAUT)).toStrictEqual([]);
    });

    it('regroupe les actions qui partagent une combinaison', () => {
      expect(
        conflits({
          ...RACCOURCIS_PAR_DEFAUT,
          processusSuivant: raccourci({ touche: 'n', alt: true }),
          sectionSuivante: raccourci({ touche: 'N' }),
        }),
      ).toStrictEqual([
        ['nouveauDiagnostic', 'sectionSuivante'],
        ['nouveauProcessus', 'processusSuivant'],
      ]);
    });
  });

  describe('stockage dans le navigateur', () => {
    it('retient les raccourcis modifiés', () => {
      const memoire = stockage();
      const modifies = { ...RACCOURCIS_PAR_DEFAUT, nouveauProcessus: raccourci({ touche: 'F2' }) };

      expect(enregistrerLesRaccourcis(memoire, modifies)).toBe(true);
      expect(chargerLesRaccourcis(memoire)).toStrictEqual(modifies);
    });

    it('complète un stockage partiel avec les valeurs par défaut', () => {
      const memoire = stockage({
        'slideshow.raccourcis': JSON.stringify({ sectionSuivante: raccourci({ touche: 'F3' }) }),
      });

      expect(chargerLesRaccourcis(memoire)).toStrictEqual({
        ...RACCOURCIS_PAR_DEFAUT,
        sectionSuivante: raccourci({ touche: 'F3' }),
      });
    });

    it.each([
      ['absent', stockage()],
      ['illisible', stockage({ 'slideshow.raccourcis': '{ pas du json' })],
      [
        'modifié à la main',
        stockage({ 'slideshow.raccourcis': JSON.stringify({ nouveauProcessus: 'Alt+N' }) }),
      ],
      ['inaccessible', undefined],
      [
        'qui lève une erreur',
        {
          getItem: () => {
            throw new Error('stockage bloqué');
          },
        },
      ],
    ])('retombe sur les valeurs par défaut avec un stockage %s', (_cas, memoire) => {
      expect(chargerLesRaccourcis(memoire)).toStrictEqual(RACCOURCIS_PAR_DEFAUT);
    });

    it.each([
      ['inaccessible', undefined],
      [
        'plein ou bloqué',
        {
          setItem: () => {
            throw new Error('quota dépassé');
          },
        },
      ],
    ])('signale un enregistrement impossible avec un stockage %s', (_cas, memoire) => {
      expect(enregistrerLesRaccourcis(memoire, RACCOURCIS_PAR_DEFAUT)).toBe(false);
    });
  });
});
