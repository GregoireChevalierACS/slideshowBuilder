import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, versionDuSchema } from './migrations.js';
import { ouvrirLaBase } from './ouvrirLaBase.js';

const dossiers: string[] = [];
const unDossierTemporaire = () => {
  const dossier = mkdtempSync(join(tmpdir(), 'slideshow-'));
  dossiers.push(dossier);
  return dossier;
};

afterEach(() => {
  for (const dossier of dossiers.splice(0)) rmSync(dossier, { recursive: true, force: true });
});

describe('ouvrirLaBase', () => {
  it('crée le fichier et ses dossiers, puis applique les migrations', () => {
    const chemin = join(unDossierTemporaire(), 'sous', 'dossier', 'diagnostics.sqlite');

    const db = ouvrirLaBase(chemin);

    expect(existsSync(chemin)).toBe(true);
    expect(versionDuSchema(db)).toBe(MIGRATIONS.length);
    db.close();
  });

  it('retrouve les données à la réouverture', () => {
    const chemin = join(unDossierTemporaire(), 'diagnostics.sqlite');
    const premiere = ouvrirLaBase(chemin);
    premiere.prepare("INSERT INTO diagnostic_versions VALUES ('a', 1, '{}')").run();
    premiere.close();

    const seconde = ouvrirLaBase(chemin);

    expect({
      ...seconde.prepare('SELECT COUNT(*) AS n FROM diagnostic_versions').get(),
    }).toStrictEqual({
      n: 1,
    });
    seconde.close();
  });

  it('active la journalisation WAL et attend un verrou plutôt que d’échouer', () => {
    const db = ouvrirLaBase(join(unDossierTemporaire(), 'diagnostics.sqlite'));

    expect({ ...db.prepare('PRAGMA journal_mode').get() }).toStrictEqual({ journal_mode: 'wal' });
    expect({ ...db.prepare('PRAGMA busy_timeout').get() }).toStrictEqual({ timeout: 5_000 });
    db.close();
  });
});
