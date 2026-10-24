import { err, ok, type Result } from '../Result.js';

export type DureeInvalide =
  | { readonly kind: 'DureeNegative'; readonly valeur: number }
  | { readonly kind: 'DureeNonEntiere'; readonly valeur: number };

const SECONDES_PAR_MINUTE = 60;

/**
 * Durée en secondes entières : les totaux annuels se calculent sans flottant, donc sans dérive
 * d'arrondi entre le détail par processus et le total présenté au client.
 */
export class Duree {
  private constructor(readonly enSecondes: number) {}

  static depuisSecondes(secondes: number): Result<Duree, DureeInvalide> {
    if (!Number.isInteger(secondes)) return err({ kind: 'DureeNonEntiere', valeur: secondes });
    if (secondes < 0) return err({ kind: 'DureeNegative', valeur: secondes });
    return ok(new Duree(secondes));
  }

  static depuisMinutes(minutes: number): Result<Duree, DureeInvalide> {
    return Duree.depuisSecondes(minutes * SECONDES_PAR_MINUTE);
  }
}
