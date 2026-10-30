import { err, ok, type Diagnostic, type Result } from '@slideshow/domain';
import type {
  DepotDeDiagnostics,
  DiagnosticDejaPresent,
  IdDeDiagnostic,
  ResumeDeDiagnostic,
  VersionDejaEnregistree,
} from '../ports.js';
import { decrireLeDiagnostic } from '../saisie/decrireLeDiagnostic.js';
import { lireLaSaisie } from '../saisie/lireLaSaisie.js';
import type { SaisieDeDiagnostic } from '../saisie/SaisieDeDiagnostic.js';

/**
 * Fake du dépôt, tenu par le même contrat que l'adapter SQLite. Il stocke une copie de la saisie et
 * la relit à chaque accès, comme une vraie base : rien de ce qui est rendu ne partage d'état.
 */
export class DepotEnMemoire implements DepotDeDiagnostics {
  private readonly versions = new Map<IdDeDiagnostic, Map<number, SaisieDeDiagnostic>>();

  enregistrer(id: IdDeDiagnostic, diagnostic: Diagnostic): Result<void, VersionDejaEnregistree> {
    const versions = this.versions.get(id) ?? new Map<number, SaisieDeDiagnostic>();
    if (versions.has(diagnostic.version)) {
      return err({ kind: 'VersionDejaEnregistree', id, version: diagnostic.version });
    }
    versions.set(diagnostic.version, structuredClone(decrireLeDiagnostic(diagnostic)));
    this.versions.set(id, versions);
    return ok(undefined);
  }

  derniereVersion(id: IdDeDiagnostic): Diagnostic | undefined {
    const versions = this.versions.get(id);
    if (versions === undefined) return undefined;
    return this.version(id, Math.max(...versions.keys()));
  }

  version(id: IdDeDiagnostic, numero: number): Diagnostic | undefined {
    const saisie = this.versions.get(id)?.get(numero);
    if (saisie === undefined) return undefined;
    const diagnostic = lireLaSaisie(structuredClone(saisie), numero);
    if (!diagnostic.ok) throw new Error(`stock corrompu : ${JSON.stringify(diagnostic.error)}`);
    return diagnostic.value;
  }

  historique(id: IdDeDiagnostic): readonly Diagnostic[] {
    return [...(this.versions.get(id)?.keys() ?? [])]
      .sort((a, b) => a - b)
      .flatMap((numero) => this.version(id, numero) ?? []);
  }

  importer(
    id: IdDeDiagnostic,
    historique: readonly Diagnostic[],
  ): Result<void, DiagnosticDejaPresent> {
    if (this.versions.has(id)) return err({ kind: 'DiagnosticDejaPresent', id });
    this.versions.set(
      id,
      new Map(historique.map((d) => [d.version, structuredClone(decrireLeDiagnostic(d))])),
    );
    return ok(undefined);
  }

  lister(): readonly ResumeDeDiagnostic[] {
    return [...this.versions.keys()]
      .flatMap((id) => {
        const diagnostic = this.derniereVersion(id);
        return diagnostic === undefined
          ? []
          : [
              {
                id,
                prospect: diagnostic.prospect.nom,
                dateDEntretien: diagnostic.dateDEntretien.iso,
                derniereVersion: diagnostic.version,
              },
            ];
      })
      .sort(
        (a, b) =>
          b.dateDEntretien.localeCompare(a.dateDEntretien) ||
          a.prospect.localeCompare(b.prospect, 'fr'),
      );
  }
}
