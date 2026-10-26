import { describe, expect, it } from 'vitest';
import { brique, CATALOGUE_DE_BRIQUES, type FamilleDeBrique } from './Brique.js';

const parFamille = (famille: FamilleDeBrique) =>
  CATALOGUE_DE_BRIQUES.filter((b) => b.famille === famille).map((b) => b.id);

describe('Catalogue de briques', () => {
  it('propose 21 briques', () => {
    expect(CATALOGUE_DE_BRIQUES).toHaveLength(21);
  });

  it('identifie chaque brique de façon unique', () => {
    const ids = CATALOGUE_DE_BRIQUES.map((b) => b.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('nomme et décrit chaque brique pour le client', () => {
    for (const b of CATALOGUE_DE_BRIQUES) {
      expect(b.nom.trim()).not.toBe('');
      expect(b.description.trim()).not.toBe('');
    }
  });

  it('range les briques par famille, dans l’ordre de lecture d’un flux', () => {
    expect(CATALOGUE_DE_BRIQUES.map((b) => b.famille)).toStrictEqual([
      ...Array<FamilleDeBrique>(5).fill('declencheur'),
      ...Array<FamilleDeBrique>(4).fill('connecteur'),
      ...Array<FamilleDeBrique>(6).fill('traitement'),
      ...Array<FamilleDeBrique>(3).fill('service'),
      ...Array<FamilleDeBrique>(3).fill('controle'),
    ]);
  });

  it.each([
    [
      'declencheur',
      ['planificateur', 'reception-email', 'webhook', 'depot-de-fichier', 'formulaire'],
    ],
    ['connecteur', ['api', 'boite-mail', 'import-export-fichiers', 'automatisation-interface']],
    [
      'traitement',
      [
        'extraction-documents',
        'classification-ia',
        'transformation-donnees',
        'generation-documents',
        'rapprochement-regles',
        'agregation-reporting',
      ],
    ],
    ['service', ['signature-electronique', 'paiement-en-ligne', 'synchronisation-agenda']],
    ['controle', ['validation-humaine', 'notification', 'journal-reprise']],
  ] as const)('famille « %s »', (famille, ids) => {
    expect(parFamille(famille)).toStrictEqual(ids);
  });

  it("signale les briques qui utilisent l'IA", () => {
    expect(CATALOGUE_DE_BRIQUES.filter((b) => b.utiliseIA).map((b) => b.id)).toStrictEqual([
      'extraction-documents',
      'classification-ia',
    ]);
  });

  it('retrouve une brique par son identifiant', () => {
    expect(brique('signature-electronique')).toMatchObject({
      id: 'signature-electronique',
      famille: 'service',
      nom: 'Signature électronique',
    });
  });
});
