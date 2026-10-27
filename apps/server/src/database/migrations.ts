import type { DatabaseSync } from 'node:sqlite';

interface Migration {
  readonly version: number;
  readonly nom: string;
  readonly monter: string;
  readonly descendre: string;
}

// Migrations versionnées, jamais modifiées une fois livrées : une évolution du schéma en ajoute une.
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    nom: 'versions des diagnostics',
    // Chaque version est une ligne : on n'écrase jamais, on ajoute. La saisie est stockée en JSON
    // et relue par les règles du domaine (ADR 0007).
    monter: `
      CREATE TABLE diagnostic_versions (
        id TEXT NOT NULL,
        version INTEGER NOT NULL CHECK (version >= 1),
        saisie TEXT NOT NULL CHECK (json_valid(saisie)),
        PRIMARY KEY (id, version)
      ) STRICT;
    `,
    descendre: 'DROP TABLE diagnostic_versions;',
  },
];

export const versionDuSchema = (db: DatabaseSync): number =>
  Number(db.prepare('PRAGMA user_version').get()?.['user_version']);

/** Une migration entière ou rien : le schéma et son numéro changent ensemble. */
const enTransaction = (db: DatabaseSync, instructions: string, versionApres: number): void => {
  db.exec('BEGIN');
  try {
    db.exec(instructions);
    db.exec(`PRAGMA user_version = ${String(versionApres)}`);
    db.exec('COMMIT');
  } catch (erreur) {
    db.exec('ROLLBACK');
    throw erreur;
  }
};

/** Monte ou descend le schéma jusqu'à la version cible (la dernière par défaut). */
export const migrer = (db: DatabaseSync, cible: number = MIGRATIONS.length): void => {
  if (!Number.isInteger(cible) || cible < 0 || cible > MIGRATIONS.length) {
    throw new RangeError(`Version de schéma inconnue : ${String(cible)}`);
  }
  const actuelle = versionDuSchema(db);

  MIGRATIONS.filter((m) => m.version > actuelle && m.version <= cible).forEach((m) => {
    enTransaction(db, m.monter, m.version);
  });
  MIGRATIONS.filter((m) => m.version <= actuelle && m.version > cible)
    .reverse()
    .forEach((m) => {
      enTransaction(db, m.descendre, m.version - 1);
    });
};
