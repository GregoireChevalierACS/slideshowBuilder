import type { DiapositiveArchitecture, FamilleDeBrique } from '@slideshow/domain';

// Mise en page du schéma d'architecture, en coordonnées d'un viewBox SVG : calculée ici, testée,
// puis simplement dessinée. Le SVG s'adapte ensuite à la taille de la diapositive.

export const LARGEUR_DU_SCHEMA = 1_000;
export const HAUTEUR_DU_SCHEMA = 520;

const MARGE = 10;
const ESPACE = 12;
// Une famille liste parfois plusieurs briques : sa boîte doit pouvoir accueillir deux lignes.
const COLONNE_DES_OUTILS = { x: 20, largeur: 230, hauteurMax: 64 };
const COLONNE_DES_FAMILLES = { x: 340, largeur: 640, hauteurMax: 92 };

const FAMILLES: readonly FamilleDeBrique[] = [
  'declencheur',
  'connecteur',
  'traitement',
  'service',
  'controle',
];

const LIBELLES: Readonly<Record<FamilleDeBrique, string>> = {
  declencheur: 'Déclencheurs',
  connecteur: 'Connecteurs',
  traitement: 'Traitements',
  service: 'Services',
  controle: 'Contrôle',
};

interface Boite {
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly hauteur: number;
}

export interface SchemaDisposé {
  readonly outils: readonly (Boite & { readonly nom: string })[];
  readonly familles: readonly (Boite & {
    readonly libelle: string;
    readonly detail: string;
    readonly ia: boolean;
  })[];
  readonly liens: readonly {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  }[];
}

/** Empile les éléments, centrés verticalement ; leurs boîtes se resserrent quand ils sont nombreux. */
const empiler = <T, R>(
  elements: readonly T[],
  colonne: { readonly x: number; readonly largeur: number; readonly hauteurMax: number },
  placer: (element: T, boite: Boite) => R,
): R[] => {
  const nombre = elements.length;
  const hauteur = Math.min(
    colonne.hauteurMax,
    (HAUTEUR_DU_SCHEMA - 2 * MARGE - (nombre - 1) * ESPACE) / nombre,
  );
  const debut = (HAUTEUR_DU_SCHEMA - (nombre * hauteur + (nombre - 1) * ESPACE)) / 2;
  return elements.map((element, i) =>
    placer(element, {
      x: colonne.x,
      largeur: colonne.largeur,
      y: debut + i * (hauteur + ESPACE),
      hauteur,
    }),
  );
};

/**
 * Les outils du client à gauche, les familles de briques à droite dans l'ordre du flux. Pour un
 * dirigeant, chaque famille est résumée par son nombre de briques ; pour un public technique, elle
 * liste ses briques.
 */
export const disposerLeSchema = (diapositive: DiapositiveArchitecture): SchemaDisposé => {
  const presentes = FAMILLES.map((famille) => ({
    famille,
    briques: diapositive.briques.filter(({ brique }) => brique.famille === famille),
  })).filter(({ briques }) => briques.length > 0);

  const familles = empiler(presentes, COLONNE_DES_FAMILLES, ({ famille, briques }, boite) => ({
    ...boite,
    libelle: LIBELLES[famille],
    detail:
      diapositive.detail === 'briques'
        ? briques.map(({ brique }) => brique.nom).join(' · ')
        : `${String(briques.length)} brique${briques.length > 1 ? 's' : ''}`,
    ia: briques.some(({ brique }) => brique.utiliseIA),
  }));

  const outils = empiler(diapositive.outils, COLONNE_DES_OUTILS, ({ nom }, boite) => ({
    ...boite,
    nom,
  }));

  // Les outils sont reliés aux connecteurs : c'est par eux que l'automatisation les lit et les écrit.
  const cible = familles.find((f) => f.libelle === LIBELLES.connecteur);
  const liens =
    cible === undefined
      ? []
      : outils.map((o) => ({
          x1: o.x + o.largeur,
          y1: o.y + o.hauteur / 2,
          x2: cible.x,
          y2: cible.y + cible.hauteur / 2,
        }));

  return { outils, familles, liens };
};
