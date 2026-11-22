import { err, ok, type Result } from '../Result.js';

export interface CouleurInvalide {
  readonly kind: 'CouleurInvalide';
  readonly valeur: string;
}

/** Contraste minimal d'un texte sur fond blanc (WCAG 2, niveau AA). */
export const CONTRASTE_MINIMAL = 4.5;

const FORMAT = /^#[0-9a-f]{6}$/;
const ETAPES_D_ASSOMBRISSEMENT = 20;

/** Luminance relative d'une composante sRGB (WCAG 2). */
const lineaire = (composante: number): number => {
  const c = composante / 255;
  // Stryker disable next-line EqualityOperator: mutant équivalent, aucune composante entière (0 à 255) ne donne exactement 0,03928, donc < et <= choisissent toujours la même formule.
  return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** La couleur principale d'un prospect, en hexadécimal : « #1f5fbf ». */
export class Couleur {
  private constructor(
    readonly rouge: number,
    readonly vert: number,
    readonly bleu: number,
  ) {}

  /** Majuscules acceptées : « #1F5FBF » vaut « #1f5fbf ». */
  static depuisHex(valeur: string): Result<Couleur, CouleurInvalide> {
    const hex = valeur.trim().toLowerCase();
    if (!FORMAT.test(hex)) return err({ kind: 'CouleurInvalide', valeur });
    const composante = (debut: number) => Number.parseInt(hex.slice(debut, debut + 2), 16);
    return ok(new Couleur(composante(1), composante(3), composante(5)));
  }

  get hex(): string {
    return `#${[this.rouge, this.vert, this.bleu]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')}`;
  }

  /** De 1 (aucun contraste) à 21 (noir sur blanc). */
  get contrasteSurBlanc(): number {
    const luminance =
      0.2126 * lineaire(this.rouge) + 0.7152 * lineaire(this.vert) + 0.0722 * lineaire(this.bleu);
    return 1.05 / (luminance + 0.05);
  }

  /**
   * La même teinte, assombrie par paliers de 5 % jusqu'à rester lisible sur fond blanc. Une couleur
   * déjà lisible est rendue telle quelle ; au pire, on arrive au noir, toujours lisible.
   */
  lisibleSurBlanc(): Couleur {
    const assombrie = (etape: number): Couleur => {
      const facteur = 1 - etape / ETAPES_D_ASSOMBRISSEMENT;
      const candidate = new Couleur(
        Math.round(this.rouge * facteur),
        Math.round(this.vert * facteur),
        Math.round(this.bleu * facteur),
      );
      // Stryker disable next-line EqualityOperator: mutant équivalent, aucun contraste calculé ne vaut exactement 4,5 (vérifié sur toute une grille de couleurs), donc > et >= s'arrêtent au même palier.
      return candidate.contrasteSurBlanc >= CONTRASTE_MINIMAL ? candidate : assombrie(etape + 1);
    };
    return assombrie(0);
  }
}
