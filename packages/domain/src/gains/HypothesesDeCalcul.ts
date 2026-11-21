import { err, ok, type Result } from '../Result.js';

export type HypothesesInvalides =
  | { readonly kind: 'JoursTravaillesInvalides'; readonly valeur: number }
  | { readonly kind: 'HeuresAnnuellesInvalides'; readonly valeur: number }
  | {
      readonly kind: 'SemainesDePointeInvalides';
      readonly valeur: number;
      /** Autant de semaines que les jours travaillés en contiennent. */
      readonly maximum: number;
    };

const JOURS_MAX_PAR_AN = 366;
const JOURS_TRAVAILLES_PAR_SEMAINE = 5;
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
    /**
     * Semaines de forte activité, pour une activité saisonnière (rénovation, tourisme…). Les
     * processus saisonniers y ont une autre fréquence que le reste de l'année ; 0 sans saison.
     */
    readonly semainesDePointe: number,
  ) {}

  /** 13 semaines de pointe : 65 jours en saison. */
  get joursEnSaison(): number {
    return this.semainesDePointe * JOURS_TRAVAILLES_PAR_SEMAINE;
  }

  /** 228 jours travaillés et 13 semaines de pointe : 163 jours hors saison. */
  get joursHorsSaison(): number {
    return this.joursTravaillesParAn - this.joursEnSaison;
  }

  /**
   * 228 jours = 365 − 104 jours de week-end − 25 jours de congés − 8 jours fériés en semaine.
   * 1 607 h = durée légale annuelle du travail à temps plein en France.
   */
  static parDefaut(): HypothesesDeCalcul {
    return new HypothesesDeCalcul(228, 1_607, 0);
  }

  static creer(valeurs: {
    readonly joursTravaillesParAn: number;
    readonly heuresAnnuellesTempsPlein: number;
    readonly semainesDePointe?: number;
  }): Result<HypothesesDeCalcul, HypothesesInvalides> {
    const { joursTravaillesParAn, heuresAnnuellesTempsPlein, semainesDePointe = 0 } = valeurs;
    if (!estEntierEntre(joursTravaillesParAn, 1, JOURS_MAX_PAR_AN)) {
      return err({ kind: 'JoursTravaillesInvalides', valeur: joursTravaillesParAn });
    }
    if (!estEntierEntre(heuresAnnuellesTempsPlein, 1, HEURES_MAX_PAR_AN)) {
      return err({ kind: 'HeuresAnnuellesInvalides', valeur: heuresAnnuellesTempsPlein });
    }
    const maximum = Math.floor(joursTravaillesParAn / JOURS_TRAVAILLES_PAR_SEMAINE);
    if (!estEntierEntre(semainesDePointe, 0, maximum)) {
      return err({ kind: 'SemainesDePointeInvalides', valeur: semainesDePointe, maximum });
    }
    return ok(
      new HypothesesDeCalcul(joursTravaillesParAn, heuresAnnuellesTempsPlein, semainesDePointe),
    );
  }
}
