import type { Fourchette } from '../gains/estimerGains.js';
import { Pourcentage } from '../gains/Pourcentage.js';
import { CATALOGUE_DE_BRIQUES, type Brique, type IdDeBrique } from './Brique.js';
import type { ProfilDAutomatisation } from './ProfilDAutomatisation.js';
import {
  declenchementParDefaut,
  niveauParDefaut,
  reglesDeComposition,
  reglesDeDeclenchement,
  reglesDeNiveau,
  type NiveauDAutomatisation,
  type RegleDeBriques,
} from './reglesDeConception.js';

export interface Justification {
  readonly briques: readonly IdDeBrique[];
  /** La règle qui a déclenché le choix, en langage métier. */
  readonly raison: string;
}

export interface SolutionProposee {
  readonly niveau: NiveauDAutomatisation;
  readonly raisonDuNiveau: string;
  /** Pré-remplissent les taux bas et haut du processus, modifiables pendant l'entretien. */
  readonly tauxSuggeres: Fourchette<Pourcentage>;
  /** Dans l'ordre du catalogue, chacune une seule fois. */
  readonly briques: readonly Brique[];
  readonly justifications: readonly Justification[];
}

const TAUX_PAR_NIVEAU: Readonly<Record<NiveauDAutomatisation, Fourchette<number>>> = {
  complete: { bas: 70, haut: 90 },
  assistee: { bas: 40, haut: 70 },
  notification: { bas: 10, haut: 30 },
};

const enJustification = (regle: RegleDeBriques): Justification => ({
  briques: regle.ajoute,
  raison: regle.quand.description,
});

/** Propose les briques et le niveau d'automatisation d'un processus, avec leurs raisons. */
export const concevoirSolution = (profil: ProfilDAutomatisation): SolutionProposee => {
  const satisfaite = (regle: { readonly quand: { estSatisfaitePar(p: typeof profil): boolean } }) =>
    regle.quand.estSatisfaitePar(profil);

  const appliquees = [
    reglesDeDeclenchement().find(satisfaite) ?? declenchementParDefaut(),
    ...reglesDeComposition().filter(satisfaite),
  ];
  const retenues = new Set(appliquees.flatMap((regle) => regle.ajoute));

  const regleDeNiveau = reglesDeNiveau().find(satisfaite) ?? niveauParDefaut();
  const taux = TAUX_PAR_NIVEAU[regleDeNiveau.niveau];

  return {
    niveau: regleDeNiveau.niveau,
    raisonDuNiveau: regleDeNiveau.quand.description,
    tauxSuggeres: { bas: Pourcentage.arrondi(taux.bas), haut: Pourcentage.arrondi(taux.haut) },
    briques: CATALOGUE_DE_BRIQUES.filter((b) => retenues.has(b.id)),
    justifications: appliquees.map(enJustification),
  };
};
