import { err, ok, type Result } from '../Result.js';

export type LogoInvalide =
  | { readonly kind: 'FormatDeLogoRefuse' }
  /** Environ 150 Kio d'image, une fois encodée en base 64. */
  | { readonly kind: 'LogoTropLourd' };

/**
 * En caractères d'URL de données, soit environ 150 Kio d'image : le logo est enregistré avec chaque
 * version du diagnostic.
 */
export const TAILLE_MAXIMALE_DU_LOGO = 200_000;

// Des images matricielles seulement : un SVG peut embarquer du script.
const FORMAT = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Le logo du prospect, sous forme d'URL de données : il s'affiche sans réseau, et se sauvegarde. */
export class Logo {
  private constructor(readonly urlDeDonnees: string) {}

  static depuisUrlDeDonnees(texte: string): Result<Logo, LogoInvalide> {
    if (texte.length > TAILLE_MAXIMALE_DU_LOGO) {
      return err({ kind: 'LogoTropLourd' });
    }
    if (!FORMAT.test(texte)) return err({ kind: 'FormatDeLogoRefuse' });
    return ok(new Logo(texte));
  }
}
