import { Duree } from '../gains/Duree.js';
import type { Fourchette } from '../gains/estimerGains.js';
import { Montant } from '../gains/Montant.js';
import type { OptionDeDeploiement } from './OptionDeDeploiement.js';

const MOIS_PAR_AN = 12;
const ANNEES_DE_COMPARAISON = 3;
const SECONDES_PAR_HEURE = 3_600;

export interface CoutDUneOption {
  readonly option: OptionDeDeploiement;
  /** Mise en place + matériel + 12 mois de frais. */
  readonly coutSurUnAn: Fourchette<Montant>;
  /** Mise en place + matériel + 36 mois de frais : la durée d'un matériel ou d'un engagement. */
  readonly coutSurTroisAns: Fourchette<Montant>;
  /** Le temps gagné par an, sur 3 ans. */
  readonly tempsRecupereSurTroisAns: Fourchette<Duree>;
  /**
   * Ce que coûte chaque heure rendue au client, de l'hypothèse favorable (frais bas, gain haut) à
   * la prudente (frais hauts, gain bas). Absent quand aucune heure n'est gagnée dans l'hypothèse :
   * une heure récupérée ne peut pas coûter une division par zéro.
   */
  readonly coutParHeureRecuperee: {
    readonly bas: Montant | undefined;
    readonly haut: Montant | undefined;
  };
}

const coutSur = (option: OptionDeDeploiement, mois: number, frais: Montant): Montant =>
  Montant.arrondi(
    option.miseEnPlace.enCentimes + option.materiel.enCentimes + mois * frais.enCentimes,
  );

const parHeure = (cout: Montant, temps: Duree): Montant | undefined =>
  temps.enSecondes === 0
    ? undefined
    : // Multiplier avant de diviser : le seul arrondi est celui du résultat.
      Montant.arrondi((cout.enCentimes * SECONDES_PAR_HEURE) / temps.enSecondes);

/**
 * Chiffre chaque option sur 1 an et sur 3 ans, et en coût par heure récupérée : le client compare
 * en heures, puisque c'est ce qui lui manque. Le temps gagné est celui des tâches faites aujourd'hui.
 */
export const chiffrerLesOptions = (
  options: readonly OptionDeDeploiement[],
  tempsGagneParAn: Fourchette<Duree>,
): CoutDUneOption[] => {
  const moisDeComparaison = ANNEES_DE_COMPARAISON * MOIS_PAR_AN;
  const tempsRecupereSurTroisAns = {
    bas: Duree.arrondie(tempsGagneParAn.bas.enSecondes * ANNEES_DE_COMPARAISON),
    haut: Duree.arrondie(tempsGagneParAn.haut.enSecondes * ANNEES_DE_COMPARAISON),
  };
  return options.map((option) => {
    const coutSurTroisAns = {
      bas: coutSur(option, moisDeComparaison, option.fraisMensuels.bas),
      haut: coutSur(option, moisDeComparaison, option.fraisMensuels.haut),
    };
    return {
      option,
      coutSurUnAn: {
        bas: coutSur(option, MOIS_PAR_AN, option.fraisMensuels.bas),
        haut: coutSur(option, MOIS_PAR_AN, option.fraisMensuels.haut),
      },
      coutSurTroisAns,
      tempsRecupereSurTroisAns,
      coutParHeureRecuperee: {
        bas: parHeure(coutSurTroisAns.bas, tempsRecupereSurTroisAns.haut),
        haut: parHeure(coutSurTroisAns.haut, tempsRecupereSurTroisAns.bas),
      },
    };
  });
};
