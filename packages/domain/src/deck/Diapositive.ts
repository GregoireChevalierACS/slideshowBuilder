import type { BriqueDeLArchitecture } from '../conception/concevoirArchitecture.js';
import type { SolutionProposee } from '../conception/concevoirSolution.js';
import type { Outil } from '../conception/Outil.js';
import type { CoutHoraire } from '../gains/CoutHoraire.js';
import type { Duree } from '../gains/Duree.js';
import type { Fourchette, GainDUnProcessus, TotalDesGains } from '../gains/estimerGains.js';
import type { HypothesesDeCalcul } from '../gains/HypothesesDeCalcul.js';
import type { Montant } from '../gains/Montant.js';
import type { Chantier } from './ordonnerLesChantiers.js';

export type PublicVise = 'dirigeant' | 'technique';
export type DureeDePresentation = 'courte' | 'complete';

export interface ParametresDuDeck {
  readonly public: PublicVise;
  readonly duree: DureeDePresentation;
}

interface AvecNotes {
  /** Pour le présentateur seulement, jamais affichées au client. */
  readonly notes: readonly string[];
}

export interface DiapositiveTitre extends AvecNotes {
  readonly kind: 'Titre';
  readonly titre: string;
  readonly prospect: string;
  readonly date: string;
  readonly version: number;
}

export interface DiapositiveObservation extends AvecNotes {
  readonly kind: 'Observation';
  readonly secteur: string | undefined;
  readonly effectifTotal: number | undefined;
  readonly outils: readonly Outil[];
  readonly processus: readonly string[];
}

export interface DiapositiveCoutCache extends AvecNotes {
  readonly kind: 'CoutCache';
  readonly tempsActuelParAn: Duree;
  readonly valeurActuelleParAn: Montant;
  /** En centièmes d'ETP. */
  readonly equivalentsTempsPleinActuels: number;
  readonly nombreDeProcessus: number;
}

export interface DiapositiveTableauDesProcessus extends AvecNotes {
  readonly kind: 'TableauDesProcessus';
  readonly lignes: readonly GainDUnProcessus[];
  readonly total: TotalDesGains;
}

export interface DiapositiveArchitecture extends AvecNotes {
  readonly kind: 'Architecture';
  /** « familles » pour un dirigeant : le schéma regroupe les briques par famille. */
  readonly detail: 'familles' | 'briques';
  readonly outils: readonly Outil[];
  readonly briques: readonly BriqueDeLArchitecture[];
  readonly utiliseIA: boolean;
}

export interface DiapositiveSolutionDUnProcessus extends AvecNotes {
  readonly kind: 'SolutionDUnProcessus';
  readonly processus: string;
  readonly solution: SolutionProposee;
}

export interface DiapositiveGainsAttendus extends AvecNotes {
  readonly kind: 'GainsAttendus';
  readonly total: TotalDesGains;
  readonly parProcessus: readonly {
    readonly processus: string;
    readonly valeurGagneeParAn: Fourchette<Montant>;
  }[];
}

export interface DiapositiveFeuilleDeRoute extends AvecNotes {
  readonly kind: 'FeuilleDeRoute';
  readonly chantiers: readonly Chantier[];
}

export interface DiapositiveHypotheses extends AvecNotes {
  readonly kind: 'Hypotheses';
  readonly hypotheses: HypothesesDeCalcul;
  readonly coutsHoraires: readonly {
    readonly processus: string;
    readonly coutHoraire: CoutHoraire;
  }[];
}

/** Le deck est décrit en données : le rendu (navigateur, PDF) est l'affaire d'un adapter. */
export type Diapositive =
  | DiapositiveTitre
  | DiapositiveObservation
  | DiapositiveCoutCache
  | DiapositiveTableauDesProcessus
  | DiapositiveArchitecture
  | DiapositiveSolutionDUnProcessus
  | DiapositiveGainsAttendus
  | DiapositiveFeuilleDeRoute
  | DiapositiveHypotheses;

export type GenreDeDiapositive = Diapositive['kind'];
