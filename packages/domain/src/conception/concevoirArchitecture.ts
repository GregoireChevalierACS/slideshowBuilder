import { CATALOGUE_DE_BRIQUES, type Brique } from './Brique.js';
import { concevoirSolution, type SolutionProposee } from './concevoirSolution.js';
import type { Outil } from './Outil.js';
import type { ProfilDAutomatisation } from './ProfilDAutomatisation.js';

export interface ProcessusAConcevoir {
  readonly nom: string;
  readonly profil: ProfilDAutomatisation;
}

export interface BriqueDeLArchitecture {
  readonly brique: Brique;
  /** Les processus qui l'utilisent : plus il y en a, plus la brique est rentable. */
  readonly processus: readonly string[];
}

export interface ArchitectureProposee {
  readonly solutions: readonly { readonly nom: string; readonly solution: SolutionProposee }[];
  /** Chaque outil une fois (repéré par son nom), dans l'ordre où il apparaît. */
  readonly outils: readonly Outil[];
  /** Dans l'ordre du catalogue, c'est-à-dire du flux. */
  readonly briques: readonly BriqueDeLArchitecture[];
  readonly utiliseIA: boolean;
}

/** Assemble les solutions de chaque processus en une architecture d'ensemble. */
export const concevoirArchitecture = (
  processus: readonly ProcessusAConcevoir[],
): ArchitectureProposee => {
  const solutions = processus.map(({ nom, profil }) => ({
    nom,
    solution: concevoirSolution(profil),
  }));

  const tousLesOutils = processus.flatMap(({ profil }) => [profil.source, profil.cible]);
  const outils = tousLesOutils.filter(
    (outil, position) => tousLesOutils.findIndex((o) => o.nom === outil.nom) === position,
  );

  const briques = CATALOGUE_DE_BRIQUES.map((brique) => ({
    brique,
    processus: solutions
      .filter(({ solution }) => solution.briques.some((b) => b.id === brique.id))
      .map(({ nom }) => nom),
  })).filter(({ processus: utilisateurs }) => utilisateurs.length > 0);

  return {
    solutions,
    outils,
    briques,
    utiliseIA: briques.some(({ brique }) => brique.utiliseIA),
  };
};
