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
}
