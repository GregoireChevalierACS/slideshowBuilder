// Fabriques de données de test. Ce sont des fonctions, appelées dans chaque test : aucune donnée
// n'est construite au chargement d'un fichier, sinon un mutant qui casse la construction ferait
// échouer le chargement sans faire échouer de test, et Stryker le compterait à tort comme survivant.

import type { Result } from '../Result.js';
import { Outil, type CategorieDOutil, type ModeDAcces } from '../conception/Outil.js';
import type { ProfilDAutomatisation } from '../conception/ProfilDAutomatisation.js';
import { DateLocale } from '../diagnostic/DateLocale.js';
import { Diagnostic, type ProcessusDuDiagnostic } from '../diagnostic/Diagnostic.js';
import { Prospect } from '../diagnostic/Prospect.js';
import { CoutHoraire } from '../gains/CoutHoraire.js';
import { Duree } from '../gains/Duree.js';
import { Effectif } from '../gains/Effectif.js';
import { Frequence, type Periode, type PeriodeSaisonniere } from '../gains/Frequence.js';
import { HypothesesDeCalcul } from '../gains/HypothesesDeCalcul.js';
import { Montant } from '../gains/Montant.js';
import { Pourcentage } from '../gains/Pourcentage.js';
import { ProcessusRedondant } from '../gains/ProcessusRedondant.js';
import { OptionDeDeploiement } from '../solution/OptionDeDeploiement.js';

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

export const uneFrequenceSaisonniere = (
  enSaison: number,
  horsSaison: number,
  periode: PeriodeSaisonniere,
): Frequence => valeurDe(Frequence.saisonniere(enSaison, horsSaison, periode));

export const desHypotheses = (
  joursTravaillesParAn = 228,
  heuresAnnuellesTempsPlein = 1_607,
  semainesDePointe = 0,
) =>
  valeurDe(
    HypothesesDeCalcul.creer({ joursTravaillesParAn, heuresAnnuellesTempsPlein, semainesDePointe }),
  );

export interface DescriptionDeProcessus {
  readonly nom?: string;
  readonly dureeEnSecondes?: number;
  /** Une fréquence régulière (nombre et période), ou une fréquence déjà construite. */
  readonly frequence?: readonly [number, Periode] | Frequence;
  readonly personnes?: number;
  readonly tauxBas?: number;
  readonly tauxHaut?: number;
  readonly coutHoraire?: CoutHoraire;
  readonly abandonne?: boolean;
}

/** Processus de référence : la saisie des factures fournisseurs (voir les scénarios). */
export const unProcessus = (description: DescriptionDeProcessus = {}): ProcessusRedondant => {
  const frequence = description.frequence ?? [20, 'jour'];
  return valeurDe(
    ProcessusRedondant.creer({
      nom: description.nom ?? 'Saisie des factures fournisseurs',
      dureeUnitaire: uneDuree(description.dureeEnSecondes ?? 240),
      frequence:
        frequence instanceof Frequence ? frequence : uneFrequence(frequence[0], frequence[1]),
      effectif: unEffectif(description.personnes ?? 2),
      tauxBas: unPourcentage(description.tauxBas ?? 70),
      tauxHaut: unPourcentage(description.tauxHaut ?? 90),
      coutHoraire: description.coutHoraire ?? CoutHoraire.direct(unMontant(3_500)),
      abandonne: description.abandonne ?? false,
    }),
  );
};

export const unOutil = (
  acces: ModeDAcces = 'api',
  categorie: CategorieDOutil = 'facturation',
  nom = `Logiciel (${acces})`,
): Outil => valeurDe(Outil.creer({ nom, categorie, acces }));

/** Profil de référence : un transfert entre deux outils à API, sans décision humaine. */
export const unProfil = (
  surcharges: Partial<ProfilDAutomatisation> = {},
): ProfilDAutomatisation => ({
  nature: 'transfert',
  source: unOutil('api', 'crm', 'CRM'),
  cible: unOutil('api', 'facturation', 'Facturation'),
  donnees: 'structurees',
  decisionHumaine: 'aucune',
  ...surcharges,
});

export const unProcessusDuDiagnostic = (
  processus: DescriptionDeProcessus = {},
  profil: Partial<ProfilDAutomatisation> = {},
): ProcessusDuDiagnostic => ({ processus: unProcessus(processus), profil: unProfil(profil) });

export const unDiagnostic = (
  processus: readonly ProcessusDuDiagnostic[] = [unProcessusDuDiagnostic()],
  prospect: Parameters<typeof Prospect.creer>[0] = { nom: 'Négoce Durand' },
  options: readonly OptionDeDeploiement[] = [],
): Diagnostic =>
  valeurDe(
    Diagnostic.creer({
      prospect: valeurDe(Prospect.creer(prospect)),
      dateDEntretien: valeurDe(DateLocale.depuisIso('2026-10-26')),
      hypotheses: desHypotheses(),
      processus,
      options,
    }),
  );

/** Une option d'hébergement, montants en euros pour la lisibilité des tests. */
export const uneOption = ({
  nom = 'Au bureau',
  miseEnPlace = 2_000,
  materiel = 800,
  fraisMensuels = [30, 50],
  inclus = ['Serveur dans vos locaux'],
  limites = ['Dépend de votre connexion'],
}: {
  readonly nom?: string;
  readonly miseEnPlace?: number;
  readonly materiel?: number;
  readonly fraisMensuels?: readonly [number, number];
  readonly inclus?: readonly string[];
  readonly limites?: readonly string[];
} = {}): OptionDeDeploiement =>
  valeurDe(
    OptionDeDeploiement.creer({
      nom,
      miseEnPlace: unMontant(miseEnPlace * 100),
      materiel: unMontant(materiel * 100),
      fraisMensuels: {
        bas: unMontant(fraisMensuels[0] * 100),
        haut: unMontant(fraisMensuels[1] * 100),
      },
      inclus,
      limites,
    }),
  );
