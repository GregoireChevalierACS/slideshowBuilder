import type { Couleur } from './Couleur.js';
import type { Logo } from './Logo.js';

/** Les couleurs du prospect sur sa page de titre. Rien n'est obligatoire. */
export interface ThemeDuProspect {
  readonly couleur?: Couleur;
  readonly logo?: Logo;
}
