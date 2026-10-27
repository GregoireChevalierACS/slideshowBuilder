import type {
  CategorieDOutil,
  DecisionHumaine,
  FormeDesDonnees,
  ModeDAcces,
  NatureDeTache,
  Periode,
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

export interface SaisieDeProcessus {
  readonly nom: string;
  readonly dureeUnitaireEnSecondes: number;
  /** Par personne. */
  readonly frequence: { readonly nombre: number; readonly periode: Periode };
  readonly personnes: number;
  readonly tauxBas: number;
  readonly tauxHaut: number;
  readonly coutHoraire: SaisieDeCoutHoraire;
  readonly profil: {
    readonly nature: NatureDeTache;
    readonly source: SaisieDOutil;
    readonly cible: SaisieDOutil;
    readonly donnees: FormeDesDonnees;
    readonly decisionHumaine: DecisionHumaine;
  };
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
  };
  readonly processus: readonly SaisieDeProcessus[];
}
