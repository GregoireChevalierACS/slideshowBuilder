import { DatabaseSync } from 'node:sqlite';
import { migrer } from '../migrations.js';

/** Base SQLite réelle, en mémoire et au dernier schéma : pour les tests hors du dossier database. */
export const uneBaseEnMemoire = (): DatabaseSync => {
  const db = new DatabaseSync(':memory:');
  migrer(db);
  return db;
};
