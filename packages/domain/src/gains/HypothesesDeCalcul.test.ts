import { describe, expect, it } from 'vitest';
import { HypothesesDeCalcul } from './HypothesesDeCalcul.js';

describe('HypothesesDeCalcul', () => {
  it('propose par défaut les valeurs françaises : 228 jours travaillés et 1 607 h par an', () => {
    expect(HypothesesDeCalcul.parDefaut()).toMatchObject({
      joursTravaillesParAn: 228,
      heuresAnnuellesTempsPlein: 1_607,
    });
  });

  it('accepte des hypothèses propres au client', () => {
    const hypotheses = HypothesesDeCalcul.creer({
      joursTravaillesParAn: 218,
      heuresAnnuellesTempsPlein: 1_600,
    });

    expect(hypotheses.ok && hypotheses.value).toMatchObject({
      joursTravaillesParAn: 218,
      heuresAnnuellesTempsPlein: 1_600,
    });
  });

  it.each([1, 366])('accepte %s jour(s) travaillé(s)', (joursTravaillesParAn) => {
    expect(
      HypothesesDeCalcul.creer({ joursTravaillesParAn, heuresAnnuellesTempsPlein: 1_607 }).ok,
    ).toBe(true);
  });

  it.each([0, 367, 200.5])('refuse %s jour(s) travaillé(s)', (joursTravaillesParAn) => {
    expect(
      HypothesesDeCalcul.creer({ joursTravaillesParAn, heuresAnnuellesTempsPlein: 1_607 }),
    ).toStrictEqual({
      ok: false,
      error: { kind: 'JoursTravaillesInvalides', valeur: joursTravaillesParAn },
    });
  });

  it.each([1, 8_784])('accepte %s heure(s) annuelle(s)', (heuresAnnuellesTempsPlein) => {
    expect(
      HypothesesDeCalcul.creer({ joursTravaillesParAn: 228, heuresAnnuellesTempsPlein }).ok,
    ).toBe(true);
  });

  it.each([0, 8_785, 1_607.5])('refuse %s heure(s) annuelle(s)', (heuresAnnuellesTempsPlein) => {
    expect(
      HypothesesDeCalcul.creer({ joursTravaillesParAn: 228, heuresAnnuellesTempsPlein }),
    ).toStrictEqual({
      ok: false,
      error: { kind: 'HeuresAnnuellesInvalides', valeur: heuresAnnuellesTempsPlein },
    });
  });
});
