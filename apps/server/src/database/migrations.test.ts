import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS, migrer, versionDuSchema } from './migrations.js';

const baseVide = () => new DatabaseSync(':memory:');

const colonnes = (db: DatabaseSync, table: string) =>
  db
    .prepare(`SELECT name, type, "notnull" AS obligatoire, pk FROM pragma_table_info(?)`)
    .all(table)
    .map((c) => ({ ...c }));

const tables = (db: DatabaseSync) =>
  db
    .prepare(`SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name`)
    .all()
    .map((t) => t['name']);

describe('migrations', () => {
  it('sont numérotées de 1 à n, sans trou', () => {
    expect(MIGRATIONS.map((m) => m.version)).toStrictEqual(MIGRATIONS.map((_, i) => i + 1));
  });

  it('amènent une base vide à la dernière version', () => {
    const db = baseVide();

    migrer(db);

    expect(versionDuSchema(db)).toBe(MIGRATIONS.length);
  });

  it('créent la table des versions de diagnostics', () => {
    const db = baseVide();
    migrer(db);

    expect(tables(db)).toStrictEqual(['diagnostic_versions']);
    expect(colonnes(db, 'diagnostic_versions')).toStrictEqual([
      { name: 'id', type: 'TEXT', obligatoire: 1, pk: 1 },
      { name: 'version', type: 'INTEGER', obligatoire: 1, pk: 2 },
      { name: 'saisie', type: 'TEXT', obligatoire: 1, pk: 0 },
    ]);
  });

  it('refusent une version inférieure à 1 et une saisie qui n’est pas du JSON', () => {
    const db = baseVide();
    migrer(db);
    const inserer = db.prepare(
      'INSERT INTO diagnostic_versions (id, version, saisie) VALUES (?, ?, ?)',
    );

    expect(() => {
      inserer.run('a', 0, '{}');
    }).toThrow(/CHECK constraint failed/);
    expect(() => {
      inserer.run('a', 1, 'pas du json');
    }).toThrow(/CHECK constraint failed/);
  });

  it('ne refont rien sur une base déjà à jour', () => {
    const db = baseVide();
    migrer(db);
    db.prepare("INSERT INTO diagnostic_versions VALUES ('a', 1, '{}')").run();

    migrer(db);

    expect({ ...db.prepare('SELECT COUNT(*) AS n FROM diagnostic_versions').get() }).toStrictEqual({
      n: 1,
    });
  });

  it('s’annulent puis se réappliquent', () => {
    const db = baseVide();
    migrer(db);

    migrer(db, 0);
    expect(versionDuSchema(db)).toBe(0);
    expect(tables(db)).toStrictEqual([]);

    migrer(db);
    expect(tables(db)).toStrictEqual(['diagnostic_versions']);
  });

  it('refusent une version cible inconnue', () => {
    expect(() => {
      migrer(baseVide(), MIGRATIONS.length + 1);
    }).toThrow(new RangeError(`Version de schéma inconnue : ${String(MIGRATIONS.length + 1)}`));
    expect(() => {
      migrer(baseVide(), -1);
    }).toThrow(RangeError);
  });

  it('annulent toute la migration si une étape échoue', () => {
    const db = baseVide();
    db.exec('CREATE TABLE diagnostic_versions (deja TEXT)');

    expect(() => {
      migrer(db);
    }).toThrow();
    expect(versionDuSchema(db)).toBe(0);
  });
});
