import type { Diapositive } from '@slideshow/domain';

/** Lignes d'un tableau qui tiennent dans une diapositive 16:9 sans réduire la police. */
export const LIGNES_PAR_PAGE = 7;
/** Une simple liste de noms est plus compacte qu'un tableau. */
const NOMS_PAR_PAGE = 2 * LIGNES_PAR_PAGE;

/** Une diapositive telle qu'affichée ; `partie` quand une liste longue a été répartie. */
export interface Page {
  readonly diapositive: Diapositive;
  readonly partie: { readonly numero: number; readonly total: number } | undefined;
}

/** Toujours au moins un morceau : une liste vide s'affiche quand même, vide. */
export const decouper = <T>(liste: readonly T[], taille: number): T[][] => {
  const morceaux: T[][] = [];
  for (let debut = 0; debut < liste.length; debut += taille) {
    morceaux.push(liste.slice(debut, debut + taille));
  }
  return morceaux.length === 0 ? [[]] : morceaux;
};

const reparties = <T>(
  liste: readonly T[],
  taille: number,
  diapositive: (morceau: T[]) => Diapositive,
): Page[] => {
  const morceaux = decouper(liste, taille);
  return morceaux.map((morceau, i) => ({
    diapositive: diapositive(morceau),
    partie: morceaux.length === 1 ? undefined : { numero: i + 1, total: morceaux.length },
  }));
};

/**
 * Répartit les listes trop longues sur plusieurs pages, pour qu'aucune ne déborde de la toile.
 * Les données du domaine ne changent pas : seule leur répartition à l'affichage.
 */
export const pagesDuDeck = (deck: readonly Diapositive[]): Page[] =>
  deck.flatMap((d): Page[] => {
    switch (d.kind) {
      case 'Observation':
        return reparties(d.processus, NOMS_PAR_PAGE, (processus) => ({ ...d, processus }));
      case 'TableauDesProcessus':
        return reparties(d.lignes, LIGNES_PAR_PAGE, (lignes) => ({ ...d, lignes }));
      case 'GainsAttendus':
        return reparties(d.parProcessus, LIGNES_PAR_PAGE, (parProcessus) => ({
          ...d,
          parProcessus,
        }));
      case 'FeuilleDeRoute':
        return reparties(d.chantiers, LIGNES_PAR_PAGE, (chantiers) => ({ ...d, chantiers }));
      case 'Hypotheses':
        return reparties(d.coutsHoraires, LIGNES_PAR_PAGE, (coutsHoraires) => ({
          ...d,
          coutsHoraires,
        }));
      case 'Titre':
      case 'CoutCache':
      case 'Architecture':
      case 'SolutionDUnProcessus':
        return [{ diapositive: d, partie: undefined }];
    }
  });
