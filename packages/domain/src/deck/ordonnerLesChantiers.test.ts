import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { NiveauDAutomatisation } from '../conception/reglesDeConception.js';
import { unMontant } from '../testing/fabriques.js';
import { ordonnerLesChantiers, type ChantierAOrdonner } from './ordonnerLesChantiers.js';

const chantier = (
  nom: string,
  niveau: NiveauDAutomatisation,
  valeurHaute: number,
): ChantierAOrdonner => ({
  nom,
  niveau,
  valeurGagneeParAn: { bas: unMontant(0), haut: unMontant(valeurHaute) },
});

const noms = (chantiers: readonly { readonly nom: string }[]) => chantiers.map((c) => c.nom);

describe('ordonnerLesChantiers', () => {
  it('commence par ce qui s’automatise complètement, puis l’assisté, puis la notification', () => {
    const ordre = ordonnerLesChantiers([
      chantier('Notification', 'notification', 900),
      chantier('Assisté', 'assistee', 900),
      chantier('Complet', 'complete', 100),
    ]);

    expect(noms(ordre)).toStrictEqual(['Complet', 'Assisté', 'Notification']);
  });

  it('à niveau égal, commence par le plus rentable', () => {
    const ordre = ordonnerLesChantiers([
      chantier('Petit', 'complete', 100),
      chantier('Gros', 'complete', 900),
      chantier('Moyen', 'complete', 500),
    ]);

    expect(noms(ordre)).toStrictEqual(['Gros', 'Moyen', 'Petit']);
  });

  it('à niveau et valeur égaux, garde l’ordre de saisie', () => {
    const ordre = ordonnerLesChantiers([
      chantier('Premier', 'assistee', 500),
      chantier('Second', 'assistee', 500),
    ]);

    expect(noms(ordre)).toStrictEqual(['Premier', 'Second']);
  });

  it('numérote les chantiers à partir de 1', () => {
    const ordre = ordonnerLesChantiers([
      chantier('B', 'assistee', 1),
      chantier('A', 'complete', 1),
    ]);

    expect(ordre.map((c) => [c.rang, c.nom, c.niveau])).toStrictEqual([
      [1, 'A', 'complete'],
      [2, 'B', 'assistee'],
    ]);
  });

  it('garde la valeur de chaque chantier', () => {
    const [premier] = ordonnerLesChantiers([chantier('A', 'complete', 1_234)]);

    expect(premier?.valeurGagneeParAn.haut.enCentimes).toBe(1_234);
  });

  it('ne perd ni n’invente aucun chantier', () => {
    const niveaux = fc.constantFrom<NiveauDAutomatisation>('complete', 'assistee', 'notification');
    fc.assert(
      fc.property(fc.array(fc.tuple(niveaux, fc.nat(10_000)), { maxLength: 20 }), (entrees) => {
        const chantiers = entrees.map(([niveau, valeur], i) =>
          chantier(`P${String(i)}`, niveau, valeur),
        );
        const ordre = ordonnerLesChantiers(chantiers);
        return (
          JSON.stringify([...noms(ordre)].sort()) === JSON.stringify([...noms(chantiers)].sort()) &&
          ordre.every((c, i) => c.rang === i + 1)
        );
      }),
    );
  });
});
