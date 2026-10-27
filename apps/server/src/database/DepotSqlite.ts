import {
  decrireLeDiagnostic,
  lireLaSaisie,
  lireUnIdDeDiagnostic,
  type DepotDeDiagnostics,
  type IdDeDiagnostic,
  type ResumeDeDiagnostic,
  type VersionDejaEnregistree,
} from '@slideshow/application';
import { err, ok, type Diagnostic, type Result } from '@slideshow/domain';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { schemaDeSaisieDeDiagnostic } from '../schemas.js';

// Les lignes renvoyées par node:sqlite ne sont pas typées : elles sont validées avant usage.
const ligneDeVersion = z.object({ version: z.number().int(), saisie: z.string() });
const ligneDeResume = z.object({ id: z.string(), version: z.number().int(), saisie: z.string() });

/** Adapter SQLite du dépôt, tenu par le même contrat que le Fake en mémoire. */
export class DepotSqlite implements DepotDeDiagnostics {
  constructor(private readonly db: DatabaseSync) {}

  enregistrer(id: IdDeDiagnostic, diagnostic: Diagnostic): Result<void, VersionDejaEnregistree> {
    // La clé primaire (id, version) garantit qu'une version n'est jamais écrasée, même par deux
    // écritures concurrentes : la seconde n'insère rien.
    const { changes } = this.db
      .prepare(
        'INSERT INTO diagnostic_versions (id, version, saisie) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
      )
      .run(id, diagnostic.version, JSON.stringify(decrireLeDiagnostic(diagnostic)));
    if (changes === 0)
      return err({ kind: 'VersionDejaEnregistree', id, version: diagnostic.version });
    return ok(undefined);
  }

  derniereVersion(id: IdDeDiagnostic): Diagnostic | undefined {
    const ligne = this.db
      .prepare(
        'SELECT version, saisie FROM diagnostic_versions WHERE id = ? ORDER BY version DESC LIMIT 1',
      )
      .get(id);
    return ligne === undefined ? undefined : this.relire(id, ligneDeVersion.parse(ligne));
  }

  version(id: IdDeDiagnostic, numero: number): Diagnostic | undefined {
    const ligne = this.db
      .prepare('SELECT version, saisie FROM diagnostic_versions WHERE id = ? AND version = ?')
      .get(id, numero);
    return ligne === undefined ? undefined : this.relire(id, ligneDeVersion.parse(ligne));
  }

  lister(): readonly ResumeDeDiagnostic[] {
    return (
      this.db
        .prepare(
          `SELECT id, version, saisie FROM diagnostic_versions AS v
         WHERE version = (SELECT MAX(version) FROM diagnostic_versions WHERE id = v.id)`,
        )
        .all()
        .map((brute) => {
          const ligne = ligneDeResume.parse(brute);
          const id = lireUnIdDeDiagnostic(ligne.id);
          if (!id.ok) throw new Error(`Stock corrompu : identifiant « ${ligne.id} »`);
          const diagnostic = this.relire(id.value, ligne);
          return {
            id: id.value,
            prospect: diagnostic.prospect.nom,
            dateDEntretien: diagnostic.dateDEntretien.iso,
            derniereVersion: diagnostic.version,
          };
        })
        // Même ordre que le Fake (comparaison française des noms), garanti par le contrat.
        .sort(
          (a, b) =>
            b.dateDEntretien.localeCompare(a.dateDEntretien) ||
            a.prospect.localeCompare(b.prospect, 'fr'),
        )
    );
  }

  /**
   * Le stock repasse par la validation de structure puis par les règles du domaine : une ligne
   * modifiée à la main ou écrite par une version incompatible est une panne, jamais acceptée.
   */
  private relire(id: IdDeDiagnostic, ligne: { version: number; saisie: string }): Diagnostic {
    const corrompu = (raison: string) =>
      new Error(`Stock corrompu (${id}, version ${String(ligne.version)}) : ${raison}`);
    const saisie = schemaDeSaisieDeDiagnostic.safeParse(JSON.parse(ligne.saisie));
    if (!saisie.success) throw corrompu(saisie.error.message);
    const diagnostic = lireLaSaisie(saisie.data, ligne.version);
    if (!diagnostic.ok) throw corrompu(JSON.stringify(diagnostic.error));
    return diagnostic.value;
  }
}
