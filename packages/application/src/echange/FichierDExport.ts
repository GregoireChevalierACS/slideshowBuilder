import type { SaisieDeDiagnostic } from '../saisie/SaisieDeDiagnostic.js';

/** Le contenu d'un fichier d'export : l'historique complet de chaque diagnostic. */
export interface ExportDeDiagnostics {
  readonly format: 'slideshow-builder/diagnostics';
  /** Les versions précédentes restent lisibles ; on écrit toujours la dernière. */
  readonly versionDuFormat: 1 | 2 | 3 | 4;
  /** Format ISO. */
  readonly exporteLe: string;
  readonly diagnostics: readonly {
    readonly id: string;
    readonly versions: readonly {
      readonly version: number;
      readonly saisie: SaisieDeDiagnostic;
    }[];
  }[];
}
