import type { Outil } from './Outil.js';

export type NatureDeTache =
  | 'saisie'
  | 'transfert'
  | 'generation-de-document'
  | 'tri'
  | 'relance'
  | 'rapprochement'
  | 'reporting'
  | 'signature'
  | 'paiement'
  | 'prise-de-rendez-vous';

export type FormeDesDonnees = 'structurees' | 'documents';

export type DecisionHumaine = 'aucune' | 'ponctuelle' | 'systematique';

/**
 * Ce qui décide de la façon d'automatiser un processus, relevé pendant l'entretien. Chaque champ
 * est un choix fermé : les règles de conception n'ont jamais à interpréter du texte libre.
 */
export interface ProfilDAutomatisation {
  readonly nature: NatureDeTache;
  /** D'où viennent les données. */
  readonly source: Outil;
  /** Où le résultat doit arriver (peut être le même outil). */
  readonly cible: Outil;
  readonly donnees: FormeDesDonnees;
  readonly decisionHumaine: DecisionHumaine;
}
