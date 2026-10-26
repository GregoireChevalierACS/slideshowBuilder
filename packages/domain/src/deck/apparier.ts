/**
 * Associe deux listes élément par élément, sans accès par indice (qui, avec
 * `noUncheckedIndexedAccess`, imposerait de traiter un `undefined` impossible).
 *
 * Réservé à des listes produites dans le même ordre à partir de la même source : des longueurs
 * différentes ne peuvent venir que d'un bug, d'où une exception.
 */
export const apparier = <A, B>(gauche: readonly A[], droite: readonly B[]): [A, B][] => {
  const echec = () =>
    new RangeError(
      `Listes de longueurs différentes : ${String(gauche.length)} et ${String(droite.length)}`,
    );
  const suivant = droite[Symbol.iterator]();

  const paires = gauche.map((element): [A, B] => {
    const correspondant = suivant.next();
    if (correspondant.done === true) throw echec();
    return [element, correspondant.value];
  });

  if (suivant.next().done !== true) throw echec();
  return paires;
};
