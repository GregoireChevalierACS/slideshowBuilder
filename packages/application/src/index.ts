// API publique de la couche application : cas d'usage, ports et format de saisie.

export {
  creerLesCasDUsage,
  type CasDUsage,
  type Dependances,
  type DiagnosticIntrouvable,
  type ModificationsDuDiagnostic,
  type VersionIntrouvable,
  type VersionPerimee,
} from './casDUsage.js';
export {
  lireUnIdDeDiagnostic,
  type DepotDeDiagnostics,
  type GenerateurDIdentifiants,
  type Horloge,
  type IdDeDiagnostic,
  type IdentifiantInvalide,
  type ResumeDeDiagnostic,
  type VersionDejaEnregistree,
} from './ports.js';
export { decrireLeDiagnostic } from './saisie/decrireLeDiagnostic.js';
export { lireLaSaisie, type ErreurDuDomaine, type SaisieInvalide } from './saisie/lireLaSaisie.js';
export type * from './saisie/SaisieDeDiagnostic.js';
