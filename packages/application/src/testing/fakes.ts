import { DateLocale } from '@slideshow/domain';
import {
  lireUnIdDeDiagnostic,
  type GenerateurDIdentifiants,
  type Horloge,
  type IdDeDiagnostic,
} from '../ports.js';

export class HorlogeFixe implements Horloge {
  constructor(private readonly iso = '2026-10-27') {}

  aujourdhui(): DateLocale {
    const date = DateLocale.depuisIso(this.iso);
    if (!date.ok) throw new Error(`date de test invalide : ${this.iso}`);
    return date.value;
  }
}

/** diagnostic-1, diagnostic-2… : des identifiants prévisibles pour les tests. */
export class IdentifiantsSequentiels implements GenerateurDIdentifiants {
  private suivant = 1;

  constructor(private readonly prefixe = 'diagnostic') {}

  nouvelIdentifiant(): IdDeDiagnostic {
    const id = lireUnIdDeDiagnostic(`${this.prefixe}-${String(this.suivant)}`);
    if (!id.ok) throw new Error(`préfixe de test invalide : ${this.prefixe}`);
    this.suivant += 1;
    return id.value;
  }
}
