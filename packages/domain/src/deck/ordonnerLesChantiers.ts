import type { NiveauDAutomatisation } from '../conception/reglesDeConception.js';
import type { Fourchette } from '../gains/estimerGains.js';
import type { Montant } from '../gains/Montant.js';

export interface ChantierAOrdonner {
  readonly nom: string;
  readonly niveau: NiveauDAutomatisation;
  readonly valeurGagneeParAn: Fourchette<Montant>;
}

export interface Chantier extends ChantierAOrdonner {
  /** À partir de 1. */
  readonly rang: number;
}

/** Les gains rapides d'abord : ce qui s'automatise le plus complètement est aussi le moins risqué. */
const PRIORITE_DU_NIVEAU: Readonly<Record<NiveauDAutomatisation, number>> = {
  complete: 0,
  assistee: 1,
  notification: 2,
};

/** Par niveau, puis par valeur haute décroissante ; à égalité, l'ordre de saisie est conservé. */
export const ordonnerLesChantiers = (chantiers: readonly ChantierAOrdonner[]): Chantier[] =>
  [...chantiers]
    .sort(
      (a, b) =>
        PRIORITE_DU_NIVEAU[a.niveau] - PRIORITE_DU_NIVEAU[b.niveau] ||
        b.valeurGagneeParAn.haut.enCentimes - a.valeurGagneeParAn.haut.enCentimes,
    )
    .map((chantier, position) => ({ ...chantier, rang: position + 1 }));
