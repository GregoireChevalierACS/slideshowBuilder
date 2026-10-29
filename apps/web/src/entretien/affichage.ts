import type { ErreurDuDomaine, SaisieInvalide } from '@slideshow/application';

const SECONDES_PAR_HEURE = 3_600;

const nombre = (fractionMax: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: fractionMax });

const euros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Une décimale sous 10 h (« 2,5 h »), des heures entières au-delà. */
export const enHeures = (secondes: number): string => {
  const heures = secondes / SECONDES_PAR_HEURE;
  return `${nombre(heures < 10 ? 1 : 0).format(heures)} h`;
};

/** À l'euro près : des centimes n'ajoutent rien à une estimation présentée à un dirigeant. */
export const enEuros = (centimes: number): string => euros.format(centimes / 100);

const eurosAuCentime = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** Pour un coût horaire : 36,09 €/h ne se lit pas comme 36 €/h. */
export const enEurosAuCentime = (centimes: number): string => eurosAuCentime.format(centimes / 100);

export const enEtp = (centiemes: number): string =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centiemes / 100)} ETP`;

export const fourchette = (
  bas: number,
  haut: number,
  format: (valeur: number) => string,
): string => (bas === haut ? format(bas) : `${format(bas)} à ${format(haut)}`);

// Chaque règle du domaine a son message : une nouvelle règle sans message ne compile pas.
const MESSAGES: Readonly<Record<ErreurDuDomaine['kind'], string>> = {
  CoefficientDeChargesInvalide: 'Coefficient entre 100 et 300 (1,00 à 3,00).',
  DateInvalide: 'Date invalide.',
  NomDeProcessusEnDouble: 'Un autre processus porte déjà ce nom.',
  VersionInvalide: 'Version invalide.',
  DureeNegative: 'La durée ne peut pas être négative.',
  DureeNonEntiere: 'Durée à la seconde près.',
  EffectifInferieurAUn: 'Au moins une personne.',
  EffectifNonEntier: 'Un nombre entier de personnes.',
  FrequenceInferieureAUn: 'Au moins une fois par période.',
  FrequenceNonEntiere: 'Un nombre entier de fois.',
  JoursTravaillesInvalides: 'Entre 1 et 366 jours.',
  HeuresAnnuellesInvalides: 'Entre 1 et 8 784 heures.',
  MontantNegatif: 'Le montant ne peut pas être négatif.',
  MontantNonEntier: 'Montant au centime près.',
  NomDOutilVide: 'Nom de l’outil à renseigner.',
  PourcentageHorsBornes: 'Entre 0 et 100 %.',
  PourcentageNonEntier: 'Un pourcentage entier.',
  NomDeProcessusVide: 'Nom du processus à renseigner.',
  TauxBasSuperieurAuTauxHaut: 'Le taux bas dépasse le taux haut.',
  NomDeProspectVide: 'Nom du prospect à renseigner.',
};

/** Le message à afficher sous un champ, s'il est celui que le domaine refuse. */
export const messageDuChamp = (
  erreur: SaisieInvalide | undefined,
  champ: string,
): string | undefined => (erreur?.champ === champ ? MESSAGES[erreur.erreur.kind] : undefined);
