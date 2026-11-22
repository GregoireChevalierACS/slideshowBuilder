import type {
  CategorieDOutil,
  DecisionHumaine,
  FormeDesDonnees,
  ModeDAcces,
  NatureDeTache,
  Periode,
  PeriodeSaisonniere,
} from '@slideshow/domain';

// Format de saisie : uniquement des nombres, des chaînes et des choix fermés, sérialisable tel quel
// en JSON. C'est ce que l'interface envoie et ce que le stockage conserve ; le domaine le valide.

export interface SaisieDOutil {
  readonly nom: string;
  readonly categorie: CategorieDOutil;
  readonly acces: ModeDAcces;
}

export type SaisieDeCoutHoraire =
  | { readonly kind: 'Direct'; readonly centimesParHeure: number }
  | {
      readonly kind: 'DepuisSalaireBrutAnnuel';
      readonly brutAnnuelEnCentimes: number;
      /** En centièmes : 145 signifie × 1,45. */
      readonly coefficientDeCharges: number;
    };

/** Régulière toute l'année, ou saisonnière : une valeur en saison, une autre le reste de l'année. */
export type SaisieDeFrequence =
  | { readonly nombre: number; readonly periode: Periode }
  | {
      readonly enSaison: number;
      readonly horsSaison: number;
      readonly periode: PeriodeSaisonniere;
    };

export interface SaisieDeProcessus {
  readonly nom: string;
  readonly dureeUnitaireEnSecondes: number;
  /** Par personne. */
  readonly frequence: SaisieDeFrequence;
  readonly personnes: number;
  readonly tauxBas: number;
  readonly tauxHaut: number;
  readonly coutHoraire: SaisieDeCoutHoraire;
  /** La tâche n'est plus faite aujourd'hui. Absent quand elle l'est. */
  readonly abandonne?: true;
  readonly profil: {
    readonly nature: NatureDeTache;
    readonly source: SaisieDOutil;
    readonly cible: SaisieDOutil;
    readonly donnees: FormeDesDonnees;
    readonly decisionHumaine: DecisionHumaine;
  };
}

/** Une façon d'héberger la solution. Montants en centimes, comme partout dans la saisie. */
export interface SaisieDOption {
  readonly nom: string;
  readonly miseEnPlaceEnCentimes: number;
  readonly materielEnCentimes: number;
  readonly fraisMensuelsBasEnCentimes: number;
  readonly fraisMensuelsHautEnCentimes: number;
  readonly inclus: readonly string[];
  readonly limites: readonly string[];
}

export interface SaisieDeDiagnostic {
  readonly prospect: {
    readonly nom: string;
    readonly secteur?: string;
    readonly effectifTotal?: number;
  };
  /** Format ISO : 2026-10-27. */
  readonly dateDEntretien: string;
  readonly hypotheses: {
    readonly joursTravaillesParAn: number;
    readonly heuresAnnuellesTempsPlein: number;
    /** Absent pour une activité sans saison (0 semaine de pointe). */
    readonly semainesDePointe?: number;
  };
  readonly processus: readonly SaisieDeProcessus[];
  /** Absent quand aucune option n'est à comparer. */
  readonly options?: readonly SaisieDOption[];
  /** Couleur (« #1f5fbf ») et logo (URL de données) du prospect. Absent sans thème. */
  readonly theme?: { readonly couleur?: string; readonly logo?: string };
}
