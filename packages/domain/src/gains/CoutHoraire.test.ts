import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CoutHoraire } from './CoutHoraire.js';
import { HypothesesDeCalcul } from './HypothesesDeCalcul.js';
import { Montant } from './Montant.js';

const montant = (centimes: number): Montant => {
  const resultat = Montant.depuisCentimes(centimes);
  if (!resultat.ok) throw new Error(`montant de test invalide : ${String(centimes)}`);
  return resultat.value;
};

const depuisSalaire = (brutAnnuelEnCentimes: number, coefficientDeCharges: number) => {
  const cout = CoutHoraire.depuisSalaireBrutAnnuel(
    montant(brutAnnuelEnCentimes),
    coefficientDeCharges,
  );
  if (!cout.ok) throw new Error(`coût de test invalide : ${cout.error.kind}`);
  return cout.value;
};

describe('CoutHoraire', () => {
  describe('saisi directement', () => {
    it('vaut le montant horaire chargé saisi', () => {
      const cout = CoutHoraire.direct(montant(3_500));

      expect(cout.centimesParHeure(HypothesesDeCalcul.parDefaut())).toBe(3_500);
    });

    it('garde le montant saisi pour l’affichage des hypothèses', () => {
      expect(CoutHoraire.direct(montant(3_500))).toMatchObject({
        kind: 'Direct',
        parHeure: { enCentimes: 3_500 },
      });
    });
  });

  describe('déduit du salaire brut annuel', () => {
    it('vaut brut annuel × coefficient de charges / heures annuelles', () => {
      const cout = depuisSalaire(4_000_000, 145);

      expect(cout.centimesParHeure(HypothesesDeCalcul.parDefaut())).toBe(5_800_000 / 1_607);
    });

    it('suit les heures annuelles propres au client', () => {
      const hypotheses = HypothesesDeCalcul.creer({
        joursTravaillesParAn: 228,
        heuresAnnuellesTempsPlein: 1_600,
      });
      if (!hypotheses.ok) throw new Error('hypothèses de test invalides');

      expect(depuisSalaire(4_000_000, 145).centimesParHeure(hypotheses.value)).toBe(3_625);
    });

    it('garde le salaire et le coefficient pour l’affichage des hypothèses', () => {
      expect(depuisSalaire(4_000_000, 145)).toMatchObject({
        kind: 'DepuisSalaireBrutAnnuel',
        brutAnnuel: { enCentimes: 4_000_000 },
        coefficientDeCharges: 145,
      });
    });

    it('propose un coefficient de charges patronales par défaut de 1,45', () => {
      expect(CoutHoraire.COEFFICIENT_DE_CHARGES_PAR_DEFAUT).toBe(145);
    });

    it.each([100, 300])('accepte un coefficient de %s centièmes', (coefficient) => {
      expect(CoutHoraire.depuisSalaireBrutAnnuel(montant(4_000_000), coefficient).ok).toBe(true);
    });

    it.each([99, 301, 145.5])('refuse un coefficient de %s centièmes', (coefficient) => {
      expect(CoutHoraire.depuisSalaireBrutAnnuel(montant(4_000_000), coefficient)).toStrictEqual({
        ok: false,
        error: { kind: 'CoefficientDeChargesInvalide', valeur: coefficient },
      });
    });

    it('coûte plus cher quand le salaire augmente', () => {
      fc.assert(
        fc.property(fc.nat(10_000_000), fc.integer({ min: 1, max: 10_000_000 }), (brut, hausse) => {
          const hypotheses = HypothesesDeCalcul.parDefaut();
          return (
            depuisSalaire(brut + hausse, 145).centimesParHeure(hypotheses) >
            depuisSalaire(brut, 145).centimesParHeure(hypotheses)
          );
        }),
      );
    });
  });
});
