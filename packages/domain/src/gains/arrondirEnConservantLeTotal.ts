export interface ElementArrondi<T> {
  readonly element: T;
  readonly arrondi: number;
}

const somme = (valeurs: readonly number[]): number => valeurs.reduce((a, b) => a + b, 0);
const partieDecimale = (valeur: number): number => valeur - Math.floor(valeur);

/**
 * Arrondit la valeur de chaque élément à l'entier en conservant le total (méthode du plus fort reste).
 *
 * Arrondies une par une, trois lignes à 0,4 € s'afficheraient 0 € chacune pour un total de 1 € :
 * le client qui refait l'addition trouverait une erreur. Ici, on arrondit d'abord le total, on
 * prend la partie entière de chaque ligne, puis on distribue les unités manquantes aux lignes dont
 * la partie décimale est la plus grande (à égalité, la première ligne l'emporte).
 *
 * Chaque arrondi est renvoyé avec son élément : l'appelant n'a jamais à recoller des tableaux par
 * leur indice.
 *
 * @param valeurExacte valeur positive non arrondie de l'élément
 */
export const arrondirEnConservantLeTotal = <T>(
  elements: readonly T[],
  valeurExacte: (element: T) => number,
): ElementArrondi<T>[] => {
  const lignes = elements.map((element) => ({ element, exacte: valeurExacte(element) }));
  // L'addition flottante n'est pas associative : selon l'ordre, une somme exacte de ,5 peut valoir
  // ,4999… et s'arrondir autrement. Additionner dans un ordre canonique (croissant) rend le total
  // indépendant de l'ordre de saisie.
  const exactesTriees = lignes.map((ligne) => ligne.exacte).sort((a, b) => a - b);
  const totalArrondi = Math.round(somme(exactesTriees));
  const unitesManquantes = totalArrondi - somme(lignes.map((ligne) => Math.floor(ligne.exacte)));

  const beneficiaires = new Set(
    [...lignes]
      // sort est stable : à partie décimale égale, l'ordre des lignes est conservé.
      .sort((a, b) => partieDecimale(b.exacte) - partieDecimale(a.exacte))
      .slice(0, unitesManquantes),
  );

  return lignes.map((ligne) => ({
    element: ligne.element,
    arrondi: Math.floor(ligne.exacte) + (beneficiaires.has(ligne) ? 1 : 0),
  }));
};
