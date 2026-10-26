import { err, ok, type Result } from '../Result.js';

export type PourcentageInvalide =
  | { readonly kind: 'PourcentageHorsBornes'; readonly valeur: number }
  | { readonly kind: 'PourcentageNonEntier'; readonly valeur: number };

/**
 * Pourcentage entier entre 0 et 100. La précision au point près suffit pour des estimations
 * présentées à un client, et l'entier évite de propager des flottants dans les calculs.
 */
export class Pourcentage {
  private constructor(readonly valeur: number) {}

  static creer(valeur: number): Result<Pourcentage, PourcentageInvalide> {
    if (!Number.isInteger(valeur)) return err({ kind: 'PourcentageNonEntier', valeur });
    if (valeur < 0 || valeur > 100) return err({ kind: 'PourcentageHorsBornes', valeur });
    return ok(new Pourcentage(valeur));
  }

  /**
   * Pour une valeur fixée par le domaine (taux par défaut, résultat de calcul), pas pour une
   * saisie : une valeur hors bornes ne peut venir que d'un bug, d'où une exception.
   */
  static arrondi(valeur: number): Pourcentage {
    const arrondie = Math.round(valeur);
    if (!Number.isFinite(arrondie) || arrondie < 0 || arrondie > 100) {
      throw new RangeError(`Pourcentage calculé invalide : ${String(valeur)}`);
    }
    return new Pourcentage(arrondie);
  }
}
