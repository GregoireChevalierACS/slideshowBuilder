import { describe, expect, it } from 'vitest';
import { GenerateurUuid, HorlogeSysteme } from './systeme.js';

describe('HorlogeSysteme', () => {
  it('donne la date locale de la machine, sans heure', () => {
    const horloge = new HorlogeSysteme(() => new Date(2026, 9, 27, 23, 59));

    expect(horloge.aujourdhui().iso).toBe('2026-10-27');
  });

  it('complète le mois et le jour sur deux chiffres', () => {
    expect(new HorlogeSysteme(() => new Date(2026, 0, 5)).aujourdhui().iso).toBe('2026-01-05');
  });

  it('lit l’horloge système par défaut', () => {
    expect(new HorlogeSysteme().aujourdhui().iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('signale une horloge système en panne', () => {
    expect(() => new HorlogeSysteme(() => new Date(Number.NaN)).aujourdhui()).toThrow(
      /Horloge système invalide/,
    );
  });
});

describe('GenerateurUuid', () => {
  it('produit des identifiants UUID tous différents', () => {
    const generateur = new GenerateurUuid();
    const ids = new Set(Array.from({ length: 100 }, () => generateur.nouvelIdentifiant()));

    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/);
  });

  it('signale une source d’aléa qui produirait un identifiant invalide', () => {
    expect(() => new GenerateurUuid(() => 'pas valide').nouvelIdentifiant()).toThrow(
      /Identifiant généré invalide : pas valide/,
    );
  });
});
