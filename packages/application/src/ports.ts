import { err, ok, type DateLocale, type Diagnostic, type Result } from '@slideshow/domain';

// Ports : ce dont les cas d'usage ont besoin, sans savoir comment c'est fait. Les adapters
// (SQLite, horloge système, générateur d'UUID) les réalisent ; les tests utilisent des Fakes.

declare const marque: unique symbol;

/** Identifiant opaque d'un diagnostic, stable d'une version à l'autre. */
export type IdDeDiagnostic = string & { readonly [marque]: 'IdDeDiagnostic' };

export interface IdentifiantInvalide {
  readonly kind: 'IdentifiantInvalide';
  readonly valeur: string;
}

const FORMAT_D_IDENTIFIANT = /^[A-Za-z0-9-]{1,64}$/;

const estUnIdDeDiagnostic = (texte: string): texte is IdDeDiagnostic =>
  FORMAT_D_IDENTIFIANT.test(texte);

/** Pour un identifiant reçu de l'extérieur (URL, base). */
export const lireUnIdDeDiagnostic = (texte: string): Result<IdDeDiagnostic, IdentifiantInvalide> =>
  estUnIdDeDiagnostic(texte) ? ok(texte) : err({ kind: 'IdentifiantInvalide', valeur: texte });

export interface Horloge {
  aujourdhui(): DateLocale;
}

export interface GenerateurDIdentifiants {
  nouvelIdentifiant(): IdDeDiagnostic;
}

export interface ResumeDeDiagnostic {
  readonly id: IdDeDiagnostic;
  readonly prospect: string;
  /** Format ISO. */
  readonly dateDEntretien: string;
  readonly derniereVersion: number;
}

export interface VersionDejaEnregistree {
  readonly kind: 'VersionDejaEnregistree';
  readonly id: IdDeDiagnostic;
  readonly version: number;
}

export interface DiagnosticDejaPresent {
  readonly kind: 'DiagnosticDejaPresent';
  readonly id: IdDeDiagnostic;
}

/**
 * Historise chaque version d'un diagnostic, sans jamais en écraser une : une présentation déjà
 * envoyée doit pouvoir être régénérée à l'identique.
 */
export interface DepotDeDiagnostics {
  /** Échoue si cette version existe déjà (deux révisions concurrentes de la même version). */
  enregistrer(id: IdDeDiagnostic, diagnostic: Diagnostic): Result<void, VersionDejaEnregistree>;
  derniereVersion(id: IdDeDiagnostic): Diagnostic | undefined;
  version(id: IdDeDiagnostic, numero: number): Diagnostic | undefined;
  /** Toutes les versions, de la plus ancienne à la plus récente ; aucune pour un diagnostic inconnu. */
  historique(id: IdDeDiagnostic): readonly Diagnostic[];
  /**
   * Enregistre d'un coup l'historique d'un diagnostic venu d'un autre poste (versions distinctes),
   * ou rien : refusé si ce diagnostic existe déjà.
   */
  importer(
    id: IdDeDiagnostic,
    historique: readonly Diagnostic[],
  ): Result<void, DiagnosticDejaPresent>;
  /** Les entretiens les plus récents d'abord, puis par prospect. */
  lister(): readonly ResumeDeDiagnostic[];
}
