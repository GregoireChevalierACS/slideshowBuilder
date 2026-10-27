import { lireUnIdDeDiagnostic } from '@slideshow/application';
import {
  uneSaisieDeDiagnostic,
  verifierLeContratDuDepotDeDiagnostics,
} from '@slideshow/application/testing';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { DepotSqlite } from './DepotSqlite.js';
import { migrer } from './migrations.js';

const uneBaseMigree = () => {
  const db = new DatabaseSync(':memory:');
  migrer(db);
  return db;
};

verifierLeContratDuDepotDeDiagnostics('SQLite', () => new DepotSqlite(uneBaseMigree()));

describe('DepotSqlite face à un stock corrompu', () => {
  const id = () => {
    const lu = lireUnIdDeDiagnostic('a');
    if (!lu.ok) throw new Error('identifiant de test invalide');
    return lu.value;
  };

  const avecUneLigne = (identifiant: string, saisie: string) => {
    const db = uneBaseMigree();
    db.prepare('INSERT INTO diagnostic_versions (id, version, saisie) VALUES (?, 1, ?)').run(
      identifiant,
      saisie,
    );
    return new DepotSqlite(db);
  };

  it('signale une saisie dont la structure ne correspond plus au format', () => {
    const depot = avecUneLigne('a', JSON.stringify({ prospect: 'pas un objet' }));

    expect(() => depot.derniereVersion(id())).toThrow(/Stock corrompu \(a, version 1\)/);
  });

  it('signale une saisie refusée par les règles du domaine', () => {
    const depot = avecUneLigne(
      'a',
      JSON.stringify(uneSaisieDeDiagnostic({ dateDEntretien: '2026-02-30' })),
    );

    expect(() => depot.version(id(), 1)).toThrow(/Stock corrompu \(a, version 1\).*DateInvalide/);
  });

  it('signale un identifiant stocké invalide', () => {
    const depot = avecUneLigne('pas valide', JSON.stringify(uneSaisieDeDiagnostic()));

    expect(() => depot.lister()).toThrow(/Stock corrompu : identifiant « pas valide »/);
  });
});
