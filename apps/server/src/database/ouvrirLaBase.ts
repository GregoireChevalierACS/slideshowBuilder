import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrer } from './migrations.js';

/** Ouvre (ou crée) le fichier de la base et le met au dernier schéma. */
export const ouvrirLaBase = (chemin: string): DatabaseSync => {
  mkdirSync(dirname(chemin), { recursive: true });
  const db = new DatabaseSync(chemin);
  // WAL : une lecture ne bloque pas une écriture, et une coupure ne corrompt pas le fichier.
  db.exec('PRAGMA journal_mode = WAL');
  // Deux onglets qui enregistrent en même temps : le second attend au lieu d'échouer aussitôt.
  db.exec('PRAGMA busy_timeout = 5000');
  migrer(db);
  return db;
};
