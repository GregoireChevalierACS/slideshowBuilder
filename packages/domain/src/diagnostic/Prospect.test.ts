import { describe, expect, it } from 'vitest';
import { unEffectif } from '../testing/fabriques.js';
import { Prospect } from './Prospect.js';

describe('Prospect', () => {
  it('identifie l’entreprise démarchée', () => {
    expect(
      Prospect.creer({
        nom: 'Négoce Durand',
        secteur: 'Négoce de matériaux',
        effectifTotal: unEffectif(25),
      }),
    ).toMatchObject({
      ok: true,
      value: {
        nom: 'Négoce Durand',
        secteur: 'Négoce de matériaux',
        effectifTotal: { personnes: 25 },
      },
    });
  });

  it('n’exige que le nom', () => {
    const prospect = Prospect.creer({ nom: 'Cabinet Martin' });

    expect(prospect.ok && prospect.value).toStrictEqual(
      expect.objectContaining({
        nom: 'Cabinet Martin',
        secteur: undefined,
        effectifTotal: undefined,
      }),
    );
  });

  it('retire les espaces et ignore un secteur vide', () => {
    const prospect = Prospect.creer({ nom: '  Cabinet Martin ', secteur: '   ' });

    expect(prospect.ok && [prospect.value.nom, prospect.value.secteur]).toStrictEqual([
      'Cabinet Martin',
      undefined,
    ]);
  });

  it('retire les espaces autour du secteur', () => {
    const prospect = Prospect.creer({ nom: 'Cabinet Martin', secteur: ' Expertise comptable ' });

    expect(prospect.ok && prospect.value.secteur).toBe('Expertise comptable');
  });

  it.each(['', '  '])('refuse un nom vide (« %s »)', (nom) => {
    expect(Prospect.creer({ nom })).toStrictEqual({
      ok: false,
      error: { kind: 'NomDeProspectVide' },
    });
  });
});
