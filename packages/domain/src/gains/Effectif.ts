import { err, ok, type Result } from '../Result.js';

export type EffectifInvalide =
  | { readonly kind: 'EffectifInferieurAUn'; readonly valeur: number }
  | { readonly kind: 'EffectifNonEntier'; readonly valeur: number };

/** Nombre de personnes qui exécutent un processus : au moins une, sinon le processus n'existe pas. */
export class Effectif {
  private constructor(readonly personnes: number) {}

  static creer(personnes: number): Result<Effectif, EffectifInvalide> {
    if (!Number.isInteger(personnes)) return err({ kind: 'EffectifNonEntier', valeur: personnes });
    if (personnes < 1) return err({ kind: 'EffectifInferieurAUn', valeur: personnes });
    return ok(new Effectif(personnes));
  }
}
