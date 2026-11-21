import { describe, expect, it } from 'vitest';
import { unMontant } from '../testing/fabriques.js';
import {
  CARACTERES_PAR_NOM,
  CARACTERES_PAR_POINT,
  OptionDeDeploiement,
  POINTS_PAR_LISTE,
  type DescriptionDOption,
} from './OptionDeDeploiement.js';

const description = (surcharges: Partial<DescriptionDOption> = {}): DescriptionDOption => ({
  nom: 'Au bureau',
  miseEnPlace: unMontant(200_000),
  materiel: unMontant(80_000),
  fraisMensuels: { bas: unMontant(3_000), haut: unMontant(5_000) },
  inclus: ['Serveur dans vos locaux'],
  limites: ['Dépend de votre connexion'],
  ...surcharges,
});

describe('OptionDeDeploiement', () => {
  it('décrit une façon d’héberger la solution et ce qu’elle coûte', () => {
    expect(OptionDeDeploiement.creer(description())).toMatchObject({
      ok: true,
      value: {
        nom: 'Au bureau',
        miseEnPlace: { enCentimes: 200_000 },
        materiel: { enCentimes: 80_000 },
        fraisMensuels: { bas: { enCentimes: 3_000 }, haut: { enCentimes: 5_000 } },
        inclus: ['Serveur dans vos locaux'],
        limites: ['Dépend de votre connexion'],
      },
    });
  });

  it('retire les espaces autour du nom et des points', () => {
    const option = OptionDeDeploiement.creer(
      description({ nom: '  Cloud  ', inclus: ['  Sauvegardes  '], limites: [' Abonnement '] }),
    );

    expect(
      option.ok && [option.value.nom, option.value.inclus, option.value.limites],
    ).toStrictEqual(['Cloud', ['Sauvegardes'], ['Abonnement']]);
  });

  it('accepte des frais fixes, sans matériel ni limite', () => {
    const option = OptionDeDeploiement.creer(
      description({
        materiel: unMontant(0),
        fraisMensuels: { bas: unMontant(4_000), haut: unMontant(4_000) },
        limites: [],
      }),
    );

    expect(option.ok).toBe(true);
  });

  it('refuse un nom vide', () => {
    expect(OptionDeDeploiement.creer(description({ nom: '   ' }))).toStrictEqual({
      ok: false,
      error: { kind: 'NomDOptionVide' },
    });
  });

  it(`tient en ${String(CARACTERES_PAR_NOM)} caractères de nom au plus`, () => {
    expect(OptionDeDeploiement.creer(description({ nom: 'n'.repeat(CARACTERES_PAR_NOM) })).ok).toBe(
      true,
    );
    expect(
      OptionDeDeploiement.creer(description({ nom: 'n'.repeat(CARACTERES_PAR_NOM + 1) })),
    ).toStrictEqual({
      ok: false,
      error: { kind: 'NomDOptionTropLong', maximum: CARACTERES_PAR_NOM },
    });
  });

  it('refuse des frais bas supérieurs aux frais hauts', () => {
    expect(
      OptionDeDeploiement.creer(
        description({ fraisMensuels: { bas: unMontant(5_001), haut: unMontant(5_000) } }),
      ),
    ).toStrictEqual({
      ok: false,
      error: { kind: 'FraisMensuelsBasSuperieursAuxHauts', bas: 5_001, haut: 5_000 },
    });
  });

  describe.each(['inclus', 'limites'] as const)('la liste « %s »', (liste) => {
    const avec = (points: readonly string[]) =>
      OptionDeDeploiement.creer(description({ [liste]: points }));

    it('refuse un point vide', () => {
      expect(avec(['Un point', '  '])).toStrictEqual({
        ok: false,
        error: { kind: 'PointVide', liste },
      });
    });

    it(`tient en ${String(POINTS_PAR_LISTE)} points au plus`, () => {
      const points = (n: number) => Array.from({ length: n }, (_, i) => `Point ${String(i)}`);

      expect(avec(points(POINTS_PAR_LISTE)).ok).toBe(true);
      expect(avec(points(POINTS_PAR_LISTE + 1))).toStrictEqual({
        ok: false,
        error: { kind: 'TropDePoints', liste, maximum: POINTS_PAR_LISTE },
      });
    });

    it(`tient en ${String(CARACTERES_PAR_POINT)} caractères par point, espaces retirés`, () => {
      expect(avec([` ${'a'.repeat(CARACTERES_PAR_POINT)} `]).ok).toBe(true);
      expect(avec(['a'.repeat(CARACTERES_PAR_POINT + 1)])).toStrictEqual({
        ok: false,
        error: { kind: 'PointTropLong', liste, maximum: CARACTERES_PAR_POINT },
      });
    });
  });
});
