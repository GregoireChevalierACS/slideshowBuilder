import { describe, expect, it } from 'vitest';
import {
  enEtp,
  enEuros,
  enEurosAuCentime,
  enHeures,
  fourchette,
  messageDuChamp,
} from './affichage.js';

/** Intl sépare les milliers par une espace fine insécable : on compare avec des espaces simples. */
const lisible = (texte: string) => texte.replace(/\s/g, ' ');

describe('affichage', () => {
  it.each([
    [114 * 3_600, '114 h'],
    [1_824 * 3_600, '1 824 h'],
    [9_000, '2,5 h'],
    [0, '0 h'],
  ])('%s secondes s’affichent « %s »', (secondes, attendu) => {
    expect(lisible(enHeures(secondes))).toBe(attendu);
  });

  it.each([
    [410_400, '4 104 €'],
    [2_268_000, '22 680 €'],
    [99, '1 €'],
  ])('%s centimes s’affichent « %s »', (centimes, attendu) => {
    expect(lisible(enEuros(centimes))).toBe(attendu);
  });

  it('écrit un coût horaire au centime près', () => {
    expect(lisible(enEurosAuCentime(5_800_000 / 1_607))).toBe('36,09 €');
  });

  it.each([
    [7, '0,07 ETP'],
    [99, '0,99 ETP'],
    [125, '1,25 ETP'],
  ])('%s centièmes d’ETP s’affichent « %s »', (centiemes, attendu) => {
    expect(enEtp(centiemes)).toBe(attendu);
  });

  it('écrit une fourchette, ou une seule valeur quand les bornes sont égales', () => {
    expect(lisible(fourchette(205_200, 328_320, enEuros))).toBe('2 052 € à 3 283 €');
    expect(lisible(fourchette(205_200, 205_200, enEuros))).toBe('2 052 €');
  });

  describe('messageDuChamp', () => {
    const surLesPersonnesDuSecond = {
      kind: 'SaisieInvalide',
      champ: 'processus[1].personnes',
      erreur: { kind: 'EffectifInferieurAUn', valeur: 0 },
    } as const;

    it('rend le message du champ fautif', () => {
      expect(messageDuChamp(surLesPersonnesDuSecond, 'processus[1].personnes')).toBe(
        'Au moins une personne.',
      );
    });

    it('ne dit rien pour un autre champ, ou sans erreur', () => {
      expect(messageDuChamp(surLesPersonnesDuSecond, 'processus[0].personnes')).toBeUndefined();
      expect(messageDuChamp(undefined, 'processus[0].personnes')).toBeUndefined();
    });
  });
});
