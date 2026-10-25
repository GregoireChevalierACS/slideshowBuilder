import { describe, expect, it } from 'vitest';
import {
  unEffectif,
  uneDuree,
  uneFrequence,
  unMontant,
  unPourcentage,
} from '../testing/fabriques.js';
import { CoutHoraire } from './CoutHoraire.js';
import { ProcessusRedondant } from './ProcessusRedondant.js';

const saisie = (surcharges: Partial<Parameters<typeof ProcessusRedondant.creer>[0]> = {}) => ({
  nom: 'Saisie des factures fournisseurs',
  dureeUnitaire: uneDuree(240),
  frequence: uneFrequence(20, 'jour'),
  effectif: unEffectif(2),
  tauxBas: unPourcentage(70),
  tauxHaut: unPourcentage(90),
  coutHoraire: CoutHoraire.direct(unMontant(3_500)),
  ...surcharges,
});

describe('ProcessusRedondant', () => {
  it('regroupe tout ce qui décrit une tâche répétitive', () => {
    const processus = ProcessusRedondant.creer(saisie());

    expect(processus).toMatchObject({
      ok: true,
      value: {
        nom: 'Saisie des factures fournisseurs',
        dureeUnitaire: { enSecondes: 240 },
        frequence: { nombre: 20, periode: 'jour' },
        effectif: { personnes: 2 },
        tauxBas: { valeur: 70 },
        tauxHaut: { valeur: 90 },
        coutHoraire: { kind: 'Direct' },
      },
    });
  });

  it('retire les espaces autour du nom', () => {
    const processus = ProcessusRedondant.creer(saisie({ nom: '  Relances clients ' }));

    expect(processus.ok && processus.value.nom).toBe('Relances clients');
  });

  it.each(['', '   '])('refuse un nom vide (« %s »)', (nom) => {
    expect(ProcessusRedondant.creer(saisie({ nom }))).toStrictEqual({
      ok: false,
      error: { kind: 'NomDeProcessusVide' },
    });
  });

  it('accepte une fourchette resserrée sur un seul taux', () => {
    const processus = ProcessusRedondant.creer(
      saisie({ tauxBas: unPourcentage(80), tauxHaut: unPourcentage(80) }),
    );

    expect(processus.ok).toBe(true);
  });

  it('refuse un taux bas supérieur au taux haut', () => {
    const processus = ProcessusRedondant.creer(
      saisie({ tauxBas: unPourcentage(91), tauxHaut: unPourcentage(90) }),
    );

    expect(processus).toStrictEqual({
      ok: false,
      error: { kind: 'TauxBasSuperieurAuTauxHaut', tauxBas: 91, tauxHaut: 90 },
    });
  });
});
