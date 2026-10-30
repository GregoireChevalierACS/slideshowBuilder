import { err, ok, type DateLocale, type Diagnostic, type Result } from '@slideshow/domain';
import { z } from 'zod';
import { lireUnIdDeDiagnostic, type IdDeDiagnostic, type IdentifiantInvalide } from '../ports.js';
import { decrireLeDiagnostic } from '../saisie/decrireLeDiagnostic.js';
import { lireLaSaisie, type SaisieInvalide } from '../saisie/lireLaSaisie.js';
import { FORMAT_D_EXPORT, schemaDExport, VERSION_DU_FORMAT_D_EXPORT } from '../schemas.js';
import type { ExportDeDiagnostics } from './FichierDExport.js';

// Le fichier d'export transporte des diagnostics d'un poste à l'autre (sauvegarde, changement de
// machine). Il contient le format de saisie (ADR 0007), et repasse donc à l'import par les mêmes
// contrôles que le stock : structure, puis règles du domaine.

export type { ExportDeDiagnostics };

/** L'historique complet d'un diagnostic, versions 1 à n dans l'ordre. */
export interface HistoriqueDeDiagnostic {
  readonly id: IdDeDiagnostic;
  readonly historique: readonly Diagnostic[];
}

export type ExportIllisible =
  /** Un fichier JSON quelconque, pas un export de cette application. */
  | { readonly kind: 'PasUnExport' }
  /** Exporté par une version plus récente de l'application. */
  | { readonly kind: 'FormatTropRecent'; readonly versionDuFormat: number }
  | {
      readonly kind: 'StructureDExportInvalide';
      readonly erreurs: readonly { readonly chemin: string; readonly message: string }[];
    }
  | IdentifiantInvalide
  | { readonly kind: 'DiagnosticEnDouble'; readonly id: string }
  /** Une version manque ou n'est pas à sa place : l'historique ne peut pas être rejoué. */
  | { readonly kind: 'HistoriqueIncomplet'; readonly id: string; readonly versionAttendue: number }
  | SaisieInvalide;

export const decrireUnExport = (
  exporteLe: DateLocale,
  diagnostics: readonly HistoriqueDeDiagnostic[],
): ExportDeDiagnostics => ({
  format: FORMAT_D_EXPORT,
  versionDuFormat: VERSION_DU_FORMAT_D_EXPORT,
  exporteLe: exporteLe.iso,
  diagnostics: diagnostics.map(({ id, historique }) => ({
    id,
    versions: historique.map((d) => ({ version: d.version, saisie: decrireLeDiagnostic(d) })),
  })),
});

const enveloppe = z.looseObject({
  format: z.literal(FORMAT_D_EXPORT),
  versionDuFormat: z.number(),
});

const lireLHistorique = (
  { id, versions }: ExportDeDiagnostics['diagnostics'][number],
  position: number,
): Result<Diagnostic[], ExportIllisible> => {
  const historique: Diagnostic[] = [];
  for (const [i, { version, saisie }] of versions.entries()) {
    if (version !== i + 1) return err({ kind: 'HistoriqueIncomplet', id, versionAttendue: i + 1 });
    const lu = lireLaSaisie(saisie, version);
    if (!lu.ok) {
      return err({
        ...lu.error,
        champ: `diagnostics[${String(position)}].versions[${String(i)}].saisie.${lu.error.champ}`,
      });
    }
    historique.push(lu.value);
  }
  return ok(historique);
};

/** Lit un fichier d'export entier, ou le refuse entier : jamais d'import partiel. */
export const lireUnExport = (brut: unknown): Result<HistoriqueDeDiagnostic[], ExportIllisible> => {
  const reconnu = enveloppe.safeParse(brut);
  if (!reconnu.success) return err({ kind: 'PasUnExport' });
  if (reconnu.data.versionDuFormat > VERSION_DU_FORMAT_D_EXPORT) {
    return err({ kind: 'FormatTropRecent', versionDuFormat: reconnu.data.versionDuFormat });
  }
  const lu = schemaDExport.safeParse(brut);
  if (!lu.success) {
    return err({
      kind: 'StructureDExportInvalide',
      erreurs: lu.error.issues.map((issue) => ({
        chemin: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const diagnostics: HistoriqueDeDiagnostic[] = [];
  for (const [position, exporte] of lu.data.diagnostics.entries()) {
    const id = lireUnIdDeDiagnostic(exporte.id);
    if (!id.ok) return id;
    if (diagnostics.some((d) => d.id === id.value)) {
      return err({ kind: 'DiagnosticEnDouble', id: exporte.id });
    }
    const historique = lireLHistorique(exporte, position);
    if (!historique.ok) return historique;
    diagnostics.push({ id: id.value, historique: historique.value });
  }
  return ok(diagnostics);
};

/** « Négoce Durand » → « negoce-durand » : un nom de fichier lisible sur tous les systèmes. */
const enSlug = (texte: string): string =>
  texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/, '');

/** Le nom proposé au téléchargement : le prospect pour un diagnostic seul, la date toujours. */
export const nomDuFichierDExport = (
  { exporteLe, diagnostics }: ExportDeDiagnostics,
  portee: 'un-diagnostic' | 'tous',
): string => {
  if (portee === 'tous') return `diagnostics-${exporteLe}.json`;
  // La dernière version donne le nom actuel du prospect.
  const prospect = diagnostics
    .flatMap((d) => d.versions)
    .reduce((_, v) => v.saisie.prospect.nom, '');
  const slug = enSlug(prospect);
  return `diagnostic-${slug === '' ? 'sans-nom' : slug}-${exporteLe}.json`;
};
