import { err, ok, type Result } from '../Result.js';
import type { HypothesesDeCalcul } from './HypothesesDeCalcul.js';
import type { Montant } from './Montant.js';

export interface CoefficientDeChargesInvalide {
  readonly kind: 'CoefficientDeChargesInvalide';
  readonly valeur: number;
}

// Strategy : deux façons d'obtenir le coût d'une heure de travail, interchangeables pour le calcul
// des gains. Chacune garde ses données d'origine pour afficher l'hypothèse telle que saisie.

class CoutHoraireDirect {
  readonly kind = 'Direct';

  constructor(readonly parHeure: Montant) {}

  centimesParHeure(): number {
    return this.parHeure.enCentimes;
  }
}

class CoutHoraireDepuisSalaireBrutAnnuel {
  readonly kind = 'DepuisSalaireBrutAnnuel';

  constructor(
    readonly brutAnnuel: Montant,
    /** En centièmes : 145 signifie × 1,45. */
    readonly coefficientDeCharges: number,
  ) {}

  /** Non arrondi : l'arrondi au centime n'est fait qu'une fois, sur la valeur gagnée. */
  centimesParHeure(hypotheses: HypothesesDeCalcul): number {
    return (
      (this.brutAnnuel.enCentimes * this.coefficientDeCharges) /
      CENTIEMES /
      hypotheses.heuresAnnuellesTempsPlein
    );
  }
}

export type CoutHoraire = CoutHoraireDirect | CoutHoraireDepuisSalaireBrutAnnuel;

const CENTIEMES = 100;
const COEFFICIENT_MIN = 100;
const COEFFICIENT_MAX = 300;

export const CoutHoraire = {
  /** Charges patronales moyennes d'un salarié du privé en France : environ 45 % du brut. */
  COEFFICIENT_DE_CHARGES_PAR_DEFAUT: 145,

  direct(parHeure: Montant): CoutHoraire {
    return new CoutHoraireDirect(parHeure);
  },

  depuisSalaireBrutAnnuel(
    brutAnnuel: Montant,
    coefficientDeCharges: number,
  ): Result<CoutHoraire, CoefficientDeChargesInvalide> {
    const valide =
      Number.isInteger(coefficientDeCharges) &&
      coefficientDeCharges >= COEFFICIENT_MIN &&
      coefficientDeCharges <= COEFFICIENT_MAX;
    if (!valide) return err({ kind: 'CoefficientDeChargesInvalide', valeur: coefficientDeCharges });
    return ok(new CoutHoraireDepuisSalaireBrutAnnuel(brutAnnuel, coefficientDeCharges));
  },
} as const;
