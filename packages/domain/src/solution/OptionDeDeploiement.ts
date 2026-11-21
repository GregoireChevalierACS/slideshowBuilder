import { err, ok, type Result } from '../Result.js';
import type { Montant } from '../gains/Montant.js';

export type OptionInvalide =
  | { readonly kind: 'NomDOptionVide' }
  | { readonly kind: 'NomDOptionTropLong'; readonly maximum: number }
  | {
      readonly kind: 'FraisMensuelsBasSuperieursAuxHauts';
      readonly bas: number;
      readonly haut: number;
    }
  | { readonly kind: 'PointVide'; readonly liste: 'inclus' | 'limites' }
  /** Une diapositive à trois colonnes ne tient qu'avec des points courts et peu nombreux. */
  | {
      readonly kind: 'TropDePoints';
      readonly liste: 'inclus' | 'limites';
      readonly maximum: number;
    }
  | {
      readonly kind: 'PointTropLong';
      readonly liste: 'inclus' | 'limites';
      readonly maximum: number;
    };

// Mesuré sur la diapositive à trois colonnes : un point tient sur une ligne, un nom sur deux.
export const POINTS_PAR_LISTE = 3;
export const CARACTERES_PAR_POINT = 40;
export const CARACTERES_PAR_NOM = 40;

export interface DescriptionDOption {
  /** « Au bureau », « Dans le cloud »… */
  readonly nom: string;
  /** Forfait d'installation et de paramétrage, payé une fois. */
  readonly miseEnPlace: Montant;
  /** Matériel acheté une fois (mini-serveur, sauvegarde…), 0 sans matériel. */
  readonly materiel: Montant;
  /** Hébergement, maintenance, licences : une fourchette tant que l'usage n'est pas mesuré. */
  readonly fraisMensuels: { readonly bas: Montant; readonly haut: Montant };
  readonly inclus: readonly string[];
  readonly limites: readonly string[];
}

const lireLaListe = (
  points: readonly string[],
  liste: 'inclus' | 'limites',
): Result<readonly string[], OptionInvalide> => {
  const nettoyes = points.map((p) => p.trim());
  if (nettoyes.some((p) => p === '')) return err({ kind: 'PointVide', liste });
  if (nettoyes.length > POINTS_PAR_LISTE) {
    return err({ kind: 'TropDePoints', liste, maximum: POINTS_PAR_LISTE });
  }
  if (nettoyes.some((p) => p.length > CARACTERES_PAR_POINT)) {
    return err({ kind: 'PointTropLong', liste, maximum: CARACTERES_PAR_POINT });
  }
  return ok(nettoyes);
};

/** Une façon d'héberger et de faire tourner la solution, avec ce qu'elle coûte. */
export class OptionDeDeploiement implements DescriptionDOption {
  private constructor(
    readonly nom: string,
    readonly miseEnPlace: Montant,
    readonly materiel: Montant,
    readonly fraisMensuels: { readonly bas: Montant; readonly haut: Montant },
    readonly inclus: readonly string[],
    readonly limites: readonly string[],
  ) {}

  static creer(description: DescriptionDOption): Result<OptionDeDeploiement, OptionInvalide> {
    const nom = description.nom.trim();
    if (nom === '') return err({ kind: 'NomDOptionVide' });
    if (nom.length > CARACTERES_PAR_NOM) {
      return err({ kind: 'NomDOptionTropLong', maximum: CARACTERES_PAR_NOM });
    }
    const { bas, haut } = description.fraisMensuels;
    if (bas.enCentimes > haut.enCentimes) {
      return err({
        kind: 'FraisMensuelsBasSuperieursAuxHauts',
        bas: bas.enCentimes,
        haut: haut.enCentimes,
      });
    }
    const inclus = lireLaListe(description.inclus, 'inclus');
    if (!inclus.ok) return inclus;
    const limites = lireLaListe(description.limites, 'limites');
    if (!limites.ok) return limites;
    return ok(
      new OptionDeDeploiement(
        nom,
        description.miseEnPlace,
        description.materiel,
        description.fraisMensuels,
        inclus.value,
        limites.value,
      ),
    );
  }
}
