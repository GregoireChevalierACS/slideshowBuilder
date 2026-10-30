// API publique de la couche application : cas d'usage, ports et format de saisie.

export {
  creerLesCasDUsage,
  type CasDUsage,
  type Dependances,
  type DiagnosticIntrouvable,
  type ModificationsDuDiagnostic,
  type ResultatDImport,
  type VersionIntrouvable,
  type VersionPerimee,
} from './casDUsage.js';
export {
  nomDuFichierDExport,
  type ExportDeDiagnostics,
  type ExportIllisible,
} from './echange/exportDeDiagnostics.js';
export {
  lireUnIdDeDiagnostic,
  type DepotDeDiagnostics,
  type DiagnosticDejaPresent,
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
export {
  appliquerLeModele,
  MODELES_DE_PROCESSUS,
  suggererLesTaux,
  type ModeleDeProcessus,
  type SuggestionDeTaux,
} from './modeles/modelesDeProcessus.js';
export {
  FORMAT_D_EXPORT,
  schemaDExport,
  schemaDuCompteRenduDImport,
  schemaDeDiagnosticPublie,
  schemaDeProspect,
  schemaDeResumeDeDiagnostic,
  schemaDeRevision,
  schemaDesModifications,
  schemaDeSaisieDeDiagnostic,
  schemaDesParametresDuDeck,
  schemaDeVersion,
} from './schemas.js';
