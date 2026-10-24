import { err, ok, type Result } from '../Result.js';

export type MontantInvalide =
  | { readonly kind: 'MontantNegatif'; readonly valeur: number }
  | { readonly kind: 'MontantNonEntier'; readonly valeur: number };

/**
 * Montant en centimes entiers, jamais en euros flottants : 0,1 + 0,2 ne doit pas apparaître comme
 * 0,30000000000000004 € sur une diapositive.
 */
export class Montant {
  private constructor(readonly enCentimes: number) {}

  static depuisCentimes(centimes: number): Result<Montant, MontantInvalide> {
    if (!Number.isInteger(centimes)) return err({ kind: 'MontantNonEntier', valeur: centimes });
    if (centimes < 0) return err({ kind: 'MontantNegatif', valeur: centimes });
    return ok(new Montant(centimes));
  }
}
