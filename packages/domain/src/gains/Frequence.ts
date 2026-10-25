import { err, ok, type Result } from '../Result.js';
import type { HypothesesDeCalcul } from './HypothesesDeCalcul.js';

export type Periode = 'jour' | 'semaine' | 'mois' | 'an';

export type FrequenceInvalide =
  | { readonly kind: 'FrequenceInferieureAUn'; readonly valeur: number }
  | { readonly kind: 'FrequenceNonEntiere'; readonly valeur: number };

const JOURS_TRAVAILLES_PAR_SEMAINE = 5;
const MOIS_PAR_AN = 12;

/**
 * Nombre de fois qu'une personne exécute une tâche par période. Toujours exprimée par personne :
 * l'effectif multiplie ensuite le temps, sans ambiguïté possible avec un volume d'équipe.
 */
export class Frequence {
  private constructor(
    readonly nombre: number,
    readonly periode: Periode,
  ) {}

  static creer(nombre: number, periode: Periode): Result<Frequence, FrequenceInvalide> {
    if (!Number.isInteger(nombre)) return err({ kind: 'FrequenceNonEntiere', valeur: nombre });
    if (nombre < 1) return err({ kind: 'FrequenceInferieureAUn', valeur: nombre });
    return ok(new Frequence(nombre, periode));
  }

  /**
   * Peut être fractionnaire pour une fréquence hebdomadaire (228 / 5 = 45,6 semaines) : l'arrondi
   * n'est fait qu'une fois, sur le temps total du processus.
   */
  occurrencesParAn(hypotheses: HypothesesDeCalcul): number {
    switch (this.periode) {
      case 'jour':
        return this.nombre * hypotheses.joursTravaillesParAn;
      case 'semaine':
        // Multiplier avant de diviser : 5 fois par semaine donne exactement 1 fois par jour.
        return (this.nombre * hypotheses.joursTravaillesParAn) / JOURS_TRAVAILLES_PAR_SEMAINE;
      case 'mois':
        return this.nombre * MOIS_PAR_AN;
      case 'an':
        return this.nombre;
    }
  }
}
