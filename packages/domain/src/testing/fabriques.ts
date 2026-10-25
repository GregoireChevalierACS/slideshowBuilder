// Fabriques de données de test. Ce sont des fonctions, appelées dans chaque test : aucune donnée
// n'est construite au chargement d'un fichier, sinon un mutant qui casse la construction ferait
// échouer le chargement sans faire échouer de test, et Stryker le compterait à tort comme survivant.

import type { Result } from '../Result.js';
import { CoutHoraire } from '../gains/CoutHoraire.js';
import { Duree } from '../gains/Duree.js';
import { Effectif } from '../gains/Effectif.js';
import { Frequence, type Periode } from '../gains/Frequence.js';
import { HypothesesDeCalcul } from '../gains/HypothesesDeCalcul.js';
import { Montant } from '../gains/Montant.js';
import { Pourcentage } from '../gains/Pourcentage.js';
import { ProcessusRedondant } from '../gains/ProcessusRedondant.js';

/** Extrait la valeur d'un résultat dont le test garantit le succès. */
export const valeurDe = <T, E>(resultat: Result<T, E>): T => {
  if (!resultat.ok) throw new Error(`donnée de test invalide : ${JSON.stringify(resultat.error)}`);
  return resultat.value;
};

export const uneDuree = (secondes: number): Duree => valeurDe(Duree.depuisSecondes(secondes));
export const unEffectif = (personnes: number): Effectif => valeurDe(Effectif.creer(personnes));
export const unPourcentage = (valeur: number): Pourcentage => valeurDe(Pourcentage.creer(valeur));
export const unMontant = (centimes: number): Montant => valeurDe(Montant.depuisCentimes(centimes));
export const uneFrequence = (nombre: number, periode: Periode): Frequence =>
  valeurDe(Frequence.creer(nombre, periode));

export const desHypotheses = (joursTravaillesParAn = 228, heuresAnnuellesTempsPlein = 1_607) =>
  valeurDe(HypothesesDeCalcul.creer({ joursTravaillesParAn, heuresAnnuellesTempsPlein }));

export interface DescriptionDeProcessus {
  readonly nom?: string;
  readonly dureeEnSecondes?: number;
  readonly frequence?: readonly [number, Periode];
  readonly personnes?: number;
  readonly tauxBas?: number;
  readonly tauxHaut?: number;
  readonly coutHoraire?: CoutHoraire;
}

/** Processus de référence : la saisie des factures fournisseurs (voir les scénarios). */
export const unProcessus = (description: DescriptionDeProcessus = {}): ProcessusRedondant => {
  const [nombre, periode] = description.frequence ?? [20, 'jour'];
  return valeurDe(
    ProcessusRedondant.creer({
      nom: description.nom ?? 'Saisie des factures fournisseurs',
      dureeUnitaire: uneDuree(description.dureeEnSecondes ?? 240),
      frequence: uneFrequence(nombre, periode),
      effectif: unEffectif(description.personnes ?? 2),
      tauxBas: unPourcentage(description.tauxBas ?? 70),
      tauxHaut: unPourcentage(description.tauxHaut ?? 90),
      coutHoraire: description.coutHoraire ?? CoutHoraire.direct(unMontant(3_500)),
    }),
  );
};
