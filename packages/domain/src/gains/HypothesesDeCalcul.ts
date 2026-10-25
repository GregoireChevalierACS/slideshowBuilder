import { err, ok, type Result } from '../Result.js';

export type HypothesesInvalides =
  | { readonly kind: 'JoursTravaillesInvalides'; readonly valeur: number }
  | { readonly kind: 'HeuresAnnuellesInvalides'; readonly valeur: number };

const JOURS_MAX_PAR_AN = 366;
const HEURES_MAX_PAR_AN = JOURS_MAX_PAR_AN * 24;

const estEntierEntre = (valeur: number, min: number, max: number): boolean =>
  Number.isInteger(valeur) && valeur >= min && valeur <= max;

/**
 * Hypothèses de calendrier communes à tous les processus d'un diagnostic. Elles sont affichées au
 * client à côté des gains : chaque chiffre doit pouvoir être recalculé à la main.
 */
export class HypothesesDeCalcul {
  private constructor(
    readonly joursTravaillesParAn: number,
    readonly heuresAnnuellesTempsPlein: number,
  ) {}

  /**
   * 228 jours = 365 − 104 jours de week-end − 25 jours de congés − 8 jours fériés en semaine.
   * 1 607 h = durée légale annuelle du travail à temps plein en France.
   */
  static parDefaut(): HypothesesDeCalcul {
    return new HypothesesDeCalcul(228, 1_607);
  }

  static creer(valeurs: {
    readonly joursTravaillesParAn: number;
    readonly heuresAnnuellesTempsPlein: number;
  }): Result<HypothesesDeCalcul, HypothesesInvalides> {
    const { joursTravaillesParAn, heuresAnnuellesTempsPlein } = valeurs;
    if (!estEntierEntre(joursTravaillesParAn, 1, JOURS_MAX_PAR_AN)) {
      return err({ kind: 'JoursTravaillesInvalides', valeur: joursTravaillesParAn });
    }
    if (!estEntierEntre(heuresAnnuellesTempsPlein, 1, HEURES_MAX_PAR_AN)) {
      return err({ kind: 'HeuresAnnuellesInvalides', valeur: heuresAnnuellesTempsPlein });
    }
    return ok(new HypothesesDeCalcul(joursTravaillesParAn, heuresAnnuellesTempsPlein));
  }
}
