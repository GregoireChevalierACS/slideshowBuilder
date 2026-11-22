import { describe, expect, it } from 'vitest';
import { unLogo } from '../testing/fabriques.js';
import { Logo, TAILLE_MAXIMALE_DU_LOGO } from './Logo.js';

describe('Logo', () => {
  it.each(['png', 'jpeg', 'webp'])('accepte une image %s en URL de données', (format) => {
    const url = `data:image/${format};base64,AAAA`;

    expect(Logo.depuisUrlDeDonnees(url)).toMatchObject({ ok: true, value: { urlDeDonnees: url } });
  });

  it.each([
    ['un SVG, qui peut embarquer du script', 'data:image/svg+xml;base64,AAAA'],
    ['une adresse web', 'https://exemple.fr/logo.png'],
    ['du base 64 invalide', 'data:image/png;base64,AA AA'],
    ['du texte autour', 'xdata:image/png;base64,AAAA'],
    ['une image vide', 'data:image/png;base64,'],
  ])('refuse %s', (_, url) => {
    expect(Logo.depuisUrlDeDonnees(url)).toStrictEqual({
      ok: false,
      error: { kind: 'FormatDeLogoRefuse' },
    });
  });

  it('refuse un logo trop lourd, et accepte la taille maximale', () => {
    const avecDesDonnees = (longueur: number) => {
      const entete = 'data:image/png;base64,';
      return entete + 'A'.repeat(longueur - entete.length);
    };

    expect(Logo.depuisUrlDeDonnees(avecDesDonnees(TAILLE_MAXIMALE_DU_LOGO)).ok).toBe(true);
    expect(Logo.depuisUrlDeDonnees(avecDesDonnees(TAILLE_MAXIMALE_DU_LOGO + 1))).toStrictEqual({
      ok: false,
      error: { kind: 'LogoTropLourd' },
    });
  });

  it('garde l’image telle quelle', () => {
    expect(unLogo().urlDeDonnees).toMatch(/^data:image\/png;base64,iVBOR/);
  });
});
