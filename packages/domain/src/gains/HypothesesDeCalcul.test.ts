import { describe, expect, it } from 'vitest';
import { HypothesesDeCalcul } from './HypothesesDeCalcul.js';

describe('HypothesesDeCalcul', () => {
  it('propose par défaut les valeurs françaises : 228 jours travaillés et 1 607 h par an', () => {
    expect(HypothesesDeCalcul.parDefaut()).toMatchObject({
      joursTravaillesParAn: 228,
      heuresAnnuellesTempsPlein: 1_607,
      semainesDePointe: 0,
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

  describe('semaines de pointe', () => {
    const avec = (semainesDePointe: number, joursTravaillesParAn = 228) =>
      HypothesesDeCalcul.creer({
        joursTravaillesParAn,
        heuresAnnuellesTempsPlein: 1_607,
        semainesDePointe,
      });

    it('partagent les jours travaillés : 13 semaines font 65 jours en saison et 163 hors saison', () => {
      const hypotheses = avec(13);

      expect(hypotheses.ok && hypotheses.value).toMatchObject({
        semainesDePointe: 13,
        joursEnSaison: 65,
        joursHorsSaison: 163,
      });
    });

    it('valent 0 si rien n’est précisé : toute l’année est hors saison', () => {
      const hypotheses = HypothesesDeCalcul.creer({
        joursTravaillesParAn: 228,
        heuresAnnuellesTempsPlein: 1_607,
      });

      expect(hypotheses.ok && hypotheses.value).toMatchObject({
        semainesDePointe: 0,
        joursEnSaison: 0,
        joursHorsSaison: 228,
      });
    });

    it.each([0, 45])('acceptent %s semaine(s) sur 228 jours travaillés', (semaines) => {
      expect(avec(semaines).ok).toBe(true);
    });

    it.each([-1, 46, 2.5])('refusent %s semaine(s) sur 228 jours (45 au plus)', (semaines) => {
      expect(avec(semaines)).toStrictEqual({
        ok: false,
        error: { kind: 'SemainesDePointeInvalides', valeur: semaines, maximum: 45 },
      });
    });

    it('ne dépassent jamais les jours travaillés : 2 semaines au plus sur 12 jours', () => {
      expect(avec(3, 12)).toMatchObject({ ok: false, error: { maximum: 2 } });
      expect(avec(2, 12).ok).toBe(true);
    });
  });
});
