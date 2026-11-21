import type { SaisieDeDiagnostic } from '../saisie/SaisieDeDiagnostic.js';

/** Le contenu d'un fichier d'export : l'historique complet de chaque diagnostic. */
export interface ExportDeDiagnostics {
  readonly format: 'slideshow-builder/diagnostics';
  /** 1 : avant la saisonnalité, toujours lisible. On écrit toujours la dernière. */
  readonly versionDuFormat: 1 | 2;
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
