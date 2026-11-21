import type { SaisieDOption } from '../saisie/SaisieDeDiagnostic.js';

export interface ModeleDOption {
  readonly id: string;
  readonly saisie: SaisieDOption;
}

/**
 * Points de départ pour comparer les façons d'héberger la solution. Les montants sont à 0 : ce sont
 * les tarifs du présentateur, à saisir avant l'entretien. Les textes sont à ajuster au cas.
 */
export const MODELES_D_OPTIONS: readonly ModeleDOption[] = [
  {
    id: 'au-bureau',
    saisie: {
      nom: 'Au bureau',
      miseEnPlaceEnCentimes: 0,
      materielEnCentimes: 0,
      fraisMensuelsBasEnCentimes: 0,
      fraisMensuelsHautEnCentimes: 0,
      inclus: ['Un mini-serveur installé dans vos locaux', 'Vos données restent chez vous'],
      limites: ['Dépend de votre connexion internet', 'Matériel à renouveler à terme'],
    },
  },
  {
    id: 'dans-le-cloud',
    saisie: {
      nom: 'Dans le cloud',
      miseEnPlaceEnCentimes: 0,
      materielEnCentimes: 0,
      fraisMensuelsBasEnCentimes: 0,
      fraisMensuelsHautEnCentimes: 0,
      inclus: ['Aucun matériel à acheter', 'Accessible du chantier comme du bureau'],
      limites: ['Un abonnement tant que le service tourne', 'Vos données chez un hébergeur'],
    },
  },
  {
    id: 'offre-type-agence',
    saisie: {
      nom: 'Offre type agence',
      miseEnPlaceEnCentimes: 0,
      materielEnCentimes: 0,
      fraisMensuelsBasEnCentimes: 0,
      fraisMensuelsHautEnCentimes: 0,
      inclus: ['Un audit de départ', 'L’abonnement à une plateforme'],
      limites: ['Un coût récurrent plus élevé', 'Peu d’adaptation à vos outils'],
    },
  },
];
