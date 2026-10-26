// API publique du domaine : seul ce fichier est importable depuis les autres paquets.

export { err, ok, type Result } from './Result.js';

export { CoutHoraire, type CoefficientDeChargesInvalide } from './gains/CoutHoraire.js';
export { Duree, type DureeInvalide } from './gains/Duree.js';
export { Effectif, type EffectifInvalide } from './gains/Effectif.js';
export {
  estimerGains,
  type AlerteDeCoherence,
  type EstimationDeGains,
  type Fourchette,
  type GainDUnProcessus,
  type TotalDesGains,
} from './gains/estimerGains.js';
export { Frequence, type FrequenceInvalide, type Periode } from './gains/Frequence.js';
export { HypothesesDeCalcul, type HypothesesInvalides } from './gains/HypothesesDeCalcul.js';
export { Montant, type MontantInvalide } from './gains/Montant.js';
export { Pourcentage, type PourcentageInvalide } from './gains/Pourcentage.js';
export {
  ProcessusRedondant,
  type DescriptionDeProcessusRedondant,
  type ProcessusInvalide,
} from './gains/ProcessusRedondant.js';

export {
  brique,
  CATALOGUE_DE_BRIQUES,
  type Brique,
  type FamilleDeBrique,
  type IdDeBrique,
} from './conception/Brique.js';
export {
  concevoirArchitecture,
  type ArchitectureProposee,
  type BriqueDeLArchitecture,
  type ProcessusAConcevoir,
} from './conception/concevoirArchitecture.js';
export {
  concevoirSolution,
  type Justification,
  type SolutionProposee,
} from './conception/concevoirSolution.js';
export {
  Outil,
  type CategorieDOutil,
  type ModeDAcces,
  type OutilInvalide,
} from './conception/Outil.js';
export type {
  DecisionHumaine,
  FormeDesDonnees,
  NatureDeTache,
  ProfilDAutomatisation,
} from './conception/ProfilDAutomatisation.js';
export type { NiveauDAutomatisation } from './conception/reglesDeConception.js';

export { DateLocale, type DateInvalide } from './diagnostic/DateLocale.js';
export {
  Diagnostic,
  type DiagnosticInvalide,
  type ProcessusDuDiagnostic,
} from './diagnostic/Diagnostic.js';
export { Prospect, type ProspectInvalide } from './diagnostic/Prospect.js';

export { construireDeck } from './deck/construireDeck.js';
export type * from './deck/Diapositive.js';
export type { Chantier } from './deck/ordonnerLesChantiers.js';
