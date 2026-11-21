import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { uneDuree, uneOption } from '../testing/fabriques.js';
import { chiffrerLesOptions } from './chiffrerLesOptions.js';

const HEURE = 3_600;

/** Le temps gagné par an, en heures. */
const unGain = (bas: number, haut: number) => ({
  bas: uneDuree(bas * HEURE),
  haut: uneDuree(haut * HEURE),
});

describe('chiffrerLesOptions', () => {
  // Au bureau : 2 000 € de mise en place, 800 € de matériel, 30 à 50 € par mois.
  // Gain : 100 à 200 h par an, soit 300 à 600 h sur 3 ans.
  const [auBureau] = chiffrerLesOptions([uneOption()], unGain(100, 200));

  it('coûte sur un an la mise en place, le matériel et 12 mois de frais : 3 160 € à 3 400 €', () => {
    expect(auBureau?.coutSurUnAn).toMatchObject({
      bas: { enCentimes: 316_000 },
      haut: { enCentimes: 340_000 },
    });
  });

  it('coûte sur trois ans la mise en place, le matériel et 36 mois de frais : 3 880 € à 4 600 €', () => {
    expect(auBureau?.coutSurTroisAns).toMatchObject({
      bas: { enCentimes: 388_000 },
      haut: { enCentimes: 460_000 },
    });
  });

  it('récupère sur trois ans trois fois le temps gagné par an : 300 à 600 h', () => {
    expect(auBureau?.tempsRecupereSurTroisAns).toMatchObject({
      bas: { enSecondes: 300 * HEURE },
      haut: { enSecondes: 600 * HEURE },
    });
  });

  it('coûte par heure récupérée de 3 880 € / 600 h = 6,47 € à 4 600 € / 300 h = 15,33 €', () => {
    expect(auBureau?.coutParHeureRecuperee).toMatchObject({
      bas: { enCentimes: 647 },
      haut: { enCentimes: 1_533 },
    });
  });

  it('chiffre chaque option, dans l’ordre de la saisie', () => {
    const chiffrees = chiffrerLesOptions(
      [uneOption({ nom: 'Au bureau' }), uneOption({ nom: 'Dans le cloud', materiel: 0 })],
      unGain(100, 200),
    );

    expect(chiffrees.map((c) => c.option.nom)).toStrictEqual(['Au bureau', 'Dans le cloud']);
  });

  it('n’a pas de coût par heure dans une hypothèse sans heure gagnée', () => {
    const [sansGainProbable] = chiffrerLesOptions([uneOption()], unGain(0, 200));
    const [sansGain] = chiffrerLesOptions([uneOption()], unGain(0, 0));

    expect(sansGainProbable?.coutParHeureRecuperee.haut).toBeUndefined();
    expect(sansGainProbable?.coutParHeureRecuperee.bas).toMatchObject({ enCentimes: 647 });
    expect(sansGain?.coutParHeureRecuperee).toStrictEqual({ bas: undefined, haut: undefined });
  });

  describe('propriétés', () => {
    const uneOptionQuelconque = () =>
      fc
        .record({
          miseEnPlace: fc.nat(20_000),
          materiel: fc.nat(5_000),
          frais: fc.tuple(fc.nat(1_000), fc.nat(1_000)),
        })
        .map(({ miseEnPlace, materiel, frais }) =>
          uneOption({
            miseEnPlace,
            materiel,
            fraisMensuels: [Math.min(...frais), Math.max(...frais)],
          }),
        );
    const unGainQuelconque = () =>
      fc
        .tuple(fc.integer({ min: 1, max: 5_000 }), fc.integer({ min: 1, max: 5_000 }))
        .map(([a, b]) => unGain(Math.min(a, b), Math.max(a, b)));

    it('le coût bas ne dépasse jamais le coût haut, ni sur un an sur trois ans', () => {
      fc.assert(
        fc.property(uneOptionQuelconque(), unGainQuelconque(), (option, gain) => {
          const [c] = chiffrerLesOptions([option], gain);
          return (
            c !== undefined &&
            c.coutSurUnAn.bas.enCentimes <= c.coutSurUnAn.haut.enCentimes &&
            c.coutSurUnAn.haut.enCentimes <= c.coutSurTroisAns.haut.enCentimes &&
            (c.coutParHeureRecuperee.bas?.enCentimes ?? 0) <=
              (c.coutParHeureRecuperee.haut?.enCentimes ?? 0)
          );
        }),
      );
    });

    it('plus d’heures gagnées rendent chaque heure moins chère', () => {
      fc.assert(
        fc.property(
          uneOptionQuelconque(),
          unGainQuelconque(),
          fc.integer({ min: 1, max: 1_000 }),
          (option, gain, enPlus) => {
            const [avant] = chiffrerLesOptions([option], gain);
            const [apres] = chiffrerLesOptions(
              [option],
              unGain(gain.bas.enSecondes / HEURE + enPlus, gain.haut.enSecondes / HEURE + enPlus),
            );
            return (
              (apres?.coutParHeureRecuperee.haut?.enCentimes ?? 0) <=
              (avant?.coutParHeureRecuperee.haut?.enCentimes ?? 0)
            );
          },
        ),
      );
    });
  });
});
