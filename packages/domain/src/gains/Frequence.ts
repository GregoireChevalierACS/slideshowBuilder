import { err, ok, type Result } from '../Result.js';
import type { HypothesesDeCalcul } from './HypothesesDeCalcul.js';

export type Periode = 'jour' | 'semaine' | 'mois' | 'an';

/** Une saison se compte en jours ou en semaines : un mois ou une année la traverserait. */
export type PeriodeSaisonniere = Extract<Periode, 'jour' | 'semaine'>;

export type FrequenceInvalide =
  | { readonly kind: 'FrequenceNegative'; readonly valeur: number }
  | { readonly kind: 'FrequenceNulle' }
  /** Plus d'une décimale : « 1,5 fois par semaine » se dit, « 1,25 » ne se mesure pas. */
  | { readonly kind: 'FrequenceTropPrecise'; readonly valeur: number };

/** La même tâche toute l'année, ou plus souvent pendant les semaines de pointe. */
export type RepartitionDeFrequence =
  | { readonly kind: 'Reguliere'; readonly nombre: number; readonly periode: Periode }
  | {
      readonly kind: 'Saisonniere';
      readonly enSaison: number;
      readonly horsSaison: number;
      readonly periode: PeriodeSaisonniere;
    };

const JOURS_TRAVAILLES_PAR_SEMAINE = 5;
const MOIS_PAR_AN = 12;
const DIXIEMES = 10;

/**
 * Le nombre en dixièmes, entier : le calcul reste exact en nombres entiers jusqu'à la seule division
 * finale, et une fréquence saisonnière égale toute l'année donne exactement la fréquence régulière.
 */
const enDixiemes = (valeur: number): Result<number, FrequenceInvalide> => {
  const dixiemes = Math.round(valeur * DIXIEMES);
  // Une valeur à une décimale se retrouve exactement en divisant ses dixièmes (2,3 = 23 / 10), même
  // si 2,3 × 10 vaut 22,999… en virgule flottante. Number.isFinite écarte l'infini, qui se
  // retrouverait lui aussi.
  if (!Number.isFinite(valeur) || dixiemes / DIXIEMES !== valeur) {
    return err({ kind: 'FrequenceTropPrecise', valeur });
  }
  if (dixiemes < 0) return err({ kind: 'FrequenceNegative', valeur });
  return ok(dixiemes);
};

/** Déjà validé à la création : un nombre à une décimale au plus. */
const dixiemesDe = (valeur: number): number => Math.round(valeur * DIXIEMES);

/**
 * Nombre de fois qu'une personne exécute une tâche par période. Toujours exprimée par personne :
 * l'effectif multiplie ensuite le temps, sans ambiguïté possible avec un volume d'équipe.
 */
export class Frequence {
  private constructor(readonly repartition: RepartitionDeFrequence) {}

  get periode(): Periode {
    return this.repartition.periode;
  }

  static creer(nombre: number, periode: Periode): Result<Frequence, FrequenceInvalide> {
    const dixiemes = enDixiemes(nombre);
    if (!dixiemes.ok) return dixiemes;
    if (dixiemes.value === 0) return err({ kind: 'FrequenceNulle' });
    return ok(new Frequence({ kind: 'Reguliere', nombre, periode }));
  }

  /** Une des deux valeurs peut être nulle (une activité qui n'existe qu'en saison), pas les deux. */
  static saisonniere(
    enSaison: number,
    horsSaison: number,
    periode: PeriodeSaisonniere,
  ): Result<Frequence, FrequenceInvalide> {
    const dixiemesEnSaison = enDixiemes(enSaison);
    if (!dixiemesEnSaison.ok) return dixiemesEnSaison;
    const dixiemesHorsSaison = enDixiemes(horsSaison);
    if (!dixiemesHorsSaison.ok) return dixiemesHorsSaison;
    if (dixiemesEnSaison.value + dixiemesHorsSaison.value === 0) {
      return err({ kind: 'FrequenceNulle' });
    }
    return ok(new Frequence({ kind: 'Saisonniere', enSaison, horsSaison, periode }));
  }

  /**
   * Peut être fractionnaire (228 / 5 = 45,6 semaines) : l'arrondi n'est fait qu'une fois, sur le
   * temps total du processus.
   */
  occurrencesParAn(hypotheses: HypothesesDeCalcul): number {
    const { repartition } = this;
    // Tout est compté en dixièmes par jour travaillé, puis divisé une seule fois.
    const dixiemesSurLAnnee =
      repartition.kind === 'Reguliere'
        ? dixiemesDe(repartition.nombre) * hypotheses.joursTravaillesParAn
        : dixiemesDe(repartition.enSaison) * hypotheses.joursEnSaison +
          dixiemesDe(repartition.horsSaison) * hypotheses.joursHorsSaison;

    switch (repartition.periode) {
      case 'jour':
        return dixiemesSurLAnnee / DIXIEMES;
      case 'semaine':
        // Multiplier avant de diviser : 5 fois par semaine donne exactement 1 fois par jour.
        return dixiemesSurLAnnee / (DIXIEMES * JOURS_TRAVAILLES_PAR_SEMAINE);
      case 'mois':
        return (dixiemesDe(repartition.nombre) * MOIS_PAR_AN) / DIXIEMES;
      case 'an':
        return dixiemesDe(repartition.nombre) / DIXIEMES;
    }
  }
}
