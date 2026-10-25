import { arrondirEnConservantLeTotal } from './arrondirEnConservantLeTotal.js';
import { Duree } from './Duree.js';
import type { HypothesesDeCalcul } from './HypothesesDeCalcul.js';
import { Montant } from './Montant.js';
import type { ProcessusRedondant } from './ProcessusRedondant.js';

export interface Fourchette<T> {
  readonly bas: T;
  readonly haut: T;
}

export interface GainDUnProcessus {
  readonly processus: ProcessusRedondant;
  readonly tempsActuelParAn: Duree;
  readonly tempsGagneParAn: Fourchette<Duree>;
  readonly valeurGagneeParAn: Fourchette<Montant>;
}

export interface TotalDesGains {
  readonly tempsActuelParAn: Duree;
  readonly tempsGagneParAn: Fourchette<Duree>;
  readonly valeurGagneeParAn: Fourchette<Montant>;
  /** En centièmes d'équivalent temps plein : 26 signifie 0,26 ETP. */
  readonly equivalentsTempsPleinLiberes: Fourchette<number>;
}

/** Incohérence probable dans la saisie, à vérifier avec le client avant de présenter les chiffres. */
export interface AlerteDeCoherence {
  readonly kind: 'TempsParPersonneSuperieurAuTempsPlein';
  readonly processus: string;
  readonly heuresParPersonneParAn: number;
}

export interface EstimationDeGains {
  readonly hypotheses: HypothesesDeCalcul;
  readonly parProcessus: readonly GainDUnProcessus[];
  readonly total: TotalDesGains;
  readonly alertes: readonly AlerteDeCoherence[];
}

const SECONDES_PAR_HEURE = 3_600;
const CENT = 100;

/** Valeurs non arrondies d'un processus, en secondes et en centimes. */
interface ValeursExactes {
  readonly secondesParPersonne: number;
  readonly secondesActuelles: number;
  readonly secondesGagneesBas: number;
  readonly secondesGagneesHaut: number;
  readonly centimesGagnesBas: number;
  readonly centimesGagnesHaut: number;
}

const valeursExactes = (
  processus: ProcessusRedondant,
  hypotheses: HypothesesDeCalcul,
): ValeursExactes => {
  const secondesParPersonne =
    processus.dureeUnitaire.enSecondes * processus.frequence.occurrencesParAn(hypotheses);
  const secondesActuelles = secondesParPersonne * processus.effectif.personnes;
  const secondesGagneesBas = (secondesActuelles * processus.tauxBas.valeur) / CENT;
  const secondesGagneesHaut = (secondesActuelles * processus.tauxHaut.valeur) / CENT;
  const centimesParSeconde =
    processus.coutHoraire.centimesParHeure(hypotheses) / SECONDES_PAR_HEURE;
  return {
    secondesParPersonne,
    secondesActuelles,
    secondesGagneesBas,
    secondesGagneesHaut,
    centimesGagnesBas: secondesGagneesBas * centimesParSeconde,
    centimesGagnesHaut: secondesGagneesHaut * centimesParSeconde,
  };
};

const somme = (valeurs: readonly number[]): number => valeurs.reduce((a, b) => a + b, 0);

/** Arrondit une colonne en conservant son total, et range l'arrondi dans chaque ligne. */
const arrondirColonne = <L, R>(
  lignes: readonly L[],
  valeurExacte: (ligne: L) => number,
  ranger: (ligne: L, arrondi: number) => R,
): R[] =>
  arrondirEnConservantLeTotal(lignes, valeurExacte).map(({ element, arrondi }) =>
    ranger(element, arrondi),
  );

/**
 * Estime le temps et l'argent que l'automatisation ferait gagner chaque année.
 *
 * Tout est calculé sans arrondi, puis chaque colonne est arrondie une seule fois en conservant son
 * total : la somme des lignes affichées est toujours égale au total affiché.
 */
export const estimerGains = (
  processus: readonly ProcessusRedondant[],
  hypotheses: HypothesesDeCalcul,
): EstimationDeGains => {
  const lignes = processus.map((p) => ({ processus: p, exacte: valeursExactes(p, hypotheses) }));

  const avecTempsActuel = arrondirColonne(
    lignes,
    (l) => l.exacte.secondesActuelles,
    (l, arrondi) => ({ ...l, tempsActuelParAn: Duree.arrondie(arrondi) }),
  );
  const avecTempsGagneBas = arrondirColonne(
    avecTempsActuel,
    (l) => l.exacte.secondesGagneesBas,
    (l, arrondi) => ({ ...l, tempsGagneBas: Duree.arrondie(arrondi) }),
  );
  const avecTempsGagneHaut = arrondirColonne(
    avecTempsGagneBas,
    (l) => l.exacte.secondesGagneesHaut,
    (l, arrondi) => ({ ...l, tempsGagneHaut: Duree.arrondie(arrondi) }),
  );
  const avecValeurBasse = arrondirColonne(
    avecTempsGagneHaut,
    (l) => l.exacte.centimesGagnesBas,
    (l, arrondi) => ({ ...l, valeurBasse: Montant.arrondi(arrondi) }),
  );
  const parProcessus = arrondirColonne(
    avecValeurBasse,
    (l) => l.exacte.centimesGagnesHaut,
    (l, arrondi): GainDUnProcessus => ({
      processus: l.processus,
      tempsActuelParAn: l.tempsActuelParAn,
      tempsGagneParAn: { bas: l.tempsGagneBas, haut: l.tempsGagneHaut },
      valeurGagneeParAn: { bas: l.valeurBasse, haut: Montant.arrondi(arrondi) },
    }),
  );

  const secondes = (duree: (gain: GainDUnProcessus) => Duree): number =>
    somme(parProcessus.map((gain) => duree(gain).enSecondes));
  const centimes = (montant: (gain: GainDUnProcessus) => Montant): number =>
    somme(parProcessus.map((gain) => montant(gain).enCentimes));

  const secondesTempsPlein = hypotheses.heuresAnnuellesTempsPlein * SECONDES_PAR_HEURE;
  const enCentiemesDeTempsPlein = (duree: number): number =>
    Math.round((duree * CENT) / secondesTempsPlein);

  const secondesGagneesBas = secondes((g) => g.tempsGagneParAn.bas);
  const secondesGagneesHaut = secondes((g) => g.tempsGagneParAn.haut);

  const total: TotalDesGains = {
    tempsActuelParAn: Duree.arrondie(secondes((g) => g.tempsActuelParAn)),
    tempsGagneParAn: {
      bas: Duree.arrondie(secondesGagneesBas),
      haut: Duree.arrondie(secondesGagneesHaut),
    },
    valeurGagneeParAn: {
      bas: Montant.arrondi(centimes((g) => g.valeurGagneeParAn.bas)),
      haut: Montant.arrondi(centimes((g) => g.valeurGagneeParAn.haut)),
    },
    equivalentsTempsPleinLiberes: {
      bas: enCentiemesDeTempsPlein(secondesGagneesBas),
      haut: enCentiemesDeTempsPlein(secondesGagneesHaut),
    },
  };

  const alertes = lignes.flatMap(({ processus: p, exacte }): AlerteDeCoherence[] => {
    if (exacte.secondesParPersonne <= secondesTempsPlein) return [];
    return [
      {
        kind: 'TempsParPersonneSuperieurAuTempsPlein',
        processus: p.nom,
        heuresParPersonneParAn: Math.round(exacte.secondesParPersonne / SECONDES_PAR_HEURE),
      },
    ];
  });

  return { hypotheses, parProcessus, total, alertes };
};
