// Scénarios de référence : des entreprises réalistes, dont les chiffres attendus sont calculés à la
// main (détail en commentaire). Ils servent de critère d'acceptation au calcul des gains : si l'un
// d'eux change, c'est le pitch présenté au client qui change.
//
// Astuce de lecture : à 36 €/h, une seconde coûte exactement 1 centime, donc la valeur en centimes
// est égale au temps en secondes.

import { describe, expect, it } from 'vitest';
import { chiffrerLesOptions } from '../solution/chiffrerLesOptions.js';
import {
  desHypotheses,
  uneFrequenceSaisonniere,
  uneOption,
  unMontant,
  unProcessus,
} from '../testing/fabriques.js';
import type { Periode } from './Frequence.js';
import { CoutHoraire } from './CoutHoraire.js';
import { estimerGains } from './estimerGains.js';

const HEURE = 3_600;
const aTrenteSixEurosDeLHeure = () => CoutHoraire.direct(unMontant(3_600));

describe('Scénarios de référence', () => {
  describe('PME de négoce, 25 salariés : facturation, relances et reporting', () => {
    const estimation = () =>
      estimerGains(
        [
          // 300 s × 12 × 228 j = 228 h par personne, × 2 = 456 h
          unProcessus({
            nom: 'Factures depuis les bons de livraison',
            dureeEnSecondes: 300,
            frequence: [12, 'jour'],
            personnes: 2,
            tauxBas: 70,
            tauxHaut: 90,
            coutHoraire: aTrenteSixEurosDeLHeure(),
          }),
          // 600 s × 15 × (228 / 5) semaines = 114 h
          unProcessus({
            nom: 'Relances des impayés',
            dureeEnSecondes: 600,
            frequence: [15, 'semaine'],
            personnes: 1,
            tauxBas: 50,
            tauxHaut: 80,
            coutHoraire: aTrenteSixEurosDeLHeure(),
          }),
          // 3 h × 12 mois = 36 h, valorisées à 60 €/h (direction)
          unProcessus({
            nom: 'Rapport mensuel des ventes',
            dureeEnSecondes: 3 * HEURE,
            frequence: [1, 'mois'],
            personnes: 1,
            tauxBas: 80,
            tauxHaut: 95,
            coutHoraire: CoutHoraire.direct(unMontant(6_000)),
          }),
        ],
        desHypotheses(),
      );

    it('passe aujourd’hui 456 + 114 + 36 = 606 h par an sur ces tâches', () => {
      expect(estimation().total.tempsActuelParAn.enSecondes).toBe(606 * HEURE);
    });

    it('gagnerait de 319,2 + 57 + 28,8 = 405 h à 410,4 + 91,2 + 34,2 = 535,8 h par an', () => {
      expect(estimation().total.tempsGagneParAn).toMatchObject({
        bas: { enSecondes: 405 * HEURE },
        haut: { enSecondes: 1_928_880 },
      });
    });

    it('économiserait de 11 491,20 + 2 052 + 1 728 = 15 271,20 € à 14 774,40 + 3 283,20 + 2 052 = 20 109,60 € par an', () => {
      expect(estimation().total.valeurGagneeParAn).toMatchObject({
        bas: { enCentimes: 1_527_120 },
        haut: { enCentimes: 2_010_960 },
      });
    });

    it('paie aujourd’hui 16 416 + 4 104 + 2 160 = 22 680 € par an ce temps, soit 0,38 ETP', () => {
      // 456 h et 114 h à 36 €/h, 36 h à 60 €/h ; 606 h / 1 607 h = 0,377
      expect(estimation().total.valeurActuelleParAn.enCentimes).toBe(2_268_000);
      expect(estimation().total.equivalentsTempsPleinActuels).toBe(38);
    });

    it('libérerait de 0,25 à 0,33 ETP (405 h et 535,8 h / 1 607 h)', () => {
      expect(estimation().total.equivalentsTempsPleinLiberes).toStrictEqual({ bas: 25, haut: 33 });
    });

    it('ne lève aucune alerte : chaque tâche reste loin d’un temps plein', () => {
      expect(estimation().alertes).toStrictEqual([]);
    });
  });

  describe('Cabinet comptable : saisie des pièces, coût déduit du salaire', () => {
    // 4 comptables à 40 000 € brut, charges × 1,45 : 5 800 000 c / 1 607 h = 3 609,21 c de l'heure
    const estimation = () => {
      const coutHoraire = CoutHoraire.depuisSalaireBrutAnnuel(unMontant(4_000_000), 145);
      if (!coutHoraire.ok) throw new Error('coût de test invalide');
      return estimerGains(
        [
          unProcessus({
            nom: 'Saisie des pièces comptables',
            dureeEnSecondes: 180,
            frequence: [40, 'jour'],
            personnes: 4,
            tauxBas: 60,
            tauxHaut: 85,
            coutHoraire: coutHoraire.value,
          }),
        ],
        desHypotheses(),
      );
    };

    it('passe 180 s × 40 × 228 j × 4 = 1 824 h par an à saisir', () => {
      expect(estimation().total.tempsActuelParAn.enSecondes).toBe(1_824 * HEURE);
    });

    it('économiserait 1 094,4 h × 36,0921 € = 39 499,19 € à 1 550,4 h × 36,0921 € = 55 957,19 €', () => {
      expect(estimation().total.valeurGagneeParAn).toMatchObject({
        bas: { enCentimes: 3_949_919 },
        haut: { enCentimes: 5_595_719 },
      });
    });

    it('libérerait de 0,68 à 0,96 ETP, soit presque un poste sur quatre', () => {
      expect(estimation().total.equivalentsTempsPleinLiberes).toStrictEqual({ bas: 68, haut: 96 });
    });
  });

  describe('Piège de saisie : un volume d’équipe saisi comme une fréquence par personne', () => {
    it('alerte quand 300 mails par jour « par personne » font 10 h par jour, soit 2 280 h par an', () => {
      const { alertes } = estimerGains(
        [
          unProcessus({
            nom: 'Tri des mails entrants',
            dureeEnSecondes: 120,
            frequence: [300, 'jour'],
            personnes: 5,
          }),
        ],
        desHypotheses(),
      );

      expect(alertes).toStrictEqual([
        {
          kind: 'TempsParPersonneSuperieurAuTempsPlein',
          processus: 'Tri des mails entrants',
          heuresParPersonneParAn: 2_280,
        },
      ]);
    });

    it('ne dit plus rien une fois corrigé en 60 mails par jour et par personne (456 h par an chacun)', () => {
      const { alertes } = estimerGains(
        [
          unProcessus({
            nom: 'Tri des mails entrants',
            dureeEnSecondes: 120,
            frequence: [60, 'jour'],
            personnes: 5,
          }),
        ],
        desHypotheses(),
      );

      expect(alertes).toStrictEqual([]);
    });
  });

  describe('Ordre de grandeur : une personne occupée 7 h par jour à une seule tâche', () => {
    it('libère 7 h × 228 j = 1 596 h, soit 0,99 ETP si la tâche est entièrement automatisée', () => {
      const { total } = estimerGains(
        [
          unProcessus({
            dureeEnSecondes: 7 * HEURE,
            frequence: [1, 'jour'],
            personnes: 1,
            tauxBas: 100,
            tauxHaut: 100,
          }),
        ],
        desHypotheses(),
      );

      expect(total.tempsGagneParAn.haut.enSecondes).toBe(1_596 * HEURE);
      expect(total.equivalentsTempsPleinLiberes.haut).toBe(99);
    });
  });

  describe('Hypothèses propres au client : 218 jours travaillés (forfait jours)', () => {
    it('réduit le temps d’une tâche quotidienne dans la même proportion : 228 h deviennent 218 h', () => {
      const { total } = estimerGains(
        [unProcessus({ dureeEnSecondes: HEURE, frequence: [1, 'jour'], personnes: 1 })],
        desHypotheses(218),
      );

      expect(total.tempsActuelParAn.enSecondes).toBe(218 * HEURE);
    });
  });

  describe('Artisan saisonnier : 13 semaines de pointe, le gérant seul au bureau', () => {
    // 228 jours travaillés dont 13 semaines de pointe : 65 jours en saison, 163 hors saison
    // (32,6 semaines). Le gérant fait tout lui-même, à 36 €/h.
    const enSaison = (
      nom: string,
      dureeEnSecondes: number,
      [pointe, reste, periode]: readonly [number, number, 'jour' | 'semaine'],
      tauxBas: number,
      tauxHaut: number,
    ) =>
      unProcessus({
        nom,
        dureeEnSecondes,
        frequence: uneFrequenceSaisonniere(pointe, reste, periode),
        personnes: 1,
        tauxBas,
        tauxHaut,
        coutHoraire: aTrenteSixEurosDeLHeure(),
      });

    const estimation = () =>
      estimerGains(
        [
          // 20 × 65 + 8 × 163 = 2 604 réponses × 240 s = 624 960 s (173,6 h)
          enSaison('Réponses aux e-mails', 240, [20, 8, 'jour'], 30, 45),
          // 8 × 65 + 3 × 163 = 1 009 questions × 300 s = 302 700 s (84,1 h)
          enSaison('Questions récurrentes', 300, [8, 3, 'jour'], 50, 75),
          // 12 × 13 + 3 × 32,6 = 253,8 commandes × 900 s = 228 420 s (63,5 h)
          enSaison('Commandes aux distributeurs', 900, [12, 3, 'semaine'], 50, 70),
          // 8 × 13 + 2 × 32,6 = 169,2 dossiers × 1 500 s = 253 800 s (70,5 h)
          enSaison('Dossiers de primes', 1_500, [8, 2, 'semaine'], 30, 50),
          // 3 × 13 + 1 × 32,6 = 71,6 h de planning = 257 760 s
          enSaison('Planning des poseurs', HEURE, [3, 1, 'semaine'], 20, 40),
          // 4 × 13 + 1,5 × 32,6 = 100,9 fins de chantier × 600 s = 60 540 s (16,8 h)
          enSaison('Fin de chantier', 600, [4, 1.5, 'semaine'], 70, 90),
        ],
        desHypotheses(228, 1_607, 13),
      );

    it('passe aujourd’hui 1 728 180 s, soit 480,05 h par an, sur ces tâches', () => {
      expect(estimation().total.tempsActuelParAn.enSecondes).toBe(1_728_180);
    });

    it('gagnerait de 173,1 h à 264,6 h par an', () => {
      // Bas : 187 488 + 151 350 + 114 210 + 76 140 + 51 552 + 42 378 = 623 118 s
      // Haut : 281 232 + 227 025 + 159 894 + 126 900 + 103 104 + 54 486 = 952 641 s
      expect(estimation().total.tempsGagneParAn).toMatchObject({
        bas: { enSecondes: 623_118 },
        haut: { enSecondes: 952_641 },
      });
    });

    it('vaut 17 281,80 € par an aujourd’hui (1 s = 1 centime à 36 €/h)', () => {
      expect(estimation().total.valeurActuelleParAn.enCentimes).toBe(1_728_180);
    });

    it('chiffre à part la relance des devis, qui n’est plus faite : 48,8 h nécessaires, 39 à 46,4 h rattrapées', () => {
      // 15 × 13 + 4 × 32,6 = 325,4 devis × 540 s (3 relances) = 175 716 s (48,8 h)
      // à 80 % : 140 572,8 s ; à 95 % : 166 930,2 s
      const relance = unProcessus({
        nom: 'Relance des devis',
        dureeEnSecondes: 540,
        frequence: uneFrequenceSaisonniere(15, 4, 'semaine'),
        personnes: 1,
        tauxBas: 80,
        tauxHaut: 95,
        coutHoraire: aTrenteSixEurosDeLHeure(),
        abandonne: true,
      });
      const avecLaRelance = estimerGains(
        [...estimation().parProcessus.map((g) => g.processus), relance],
        desHypotheses(228, 1_607, 13),
      );

      expect(avecLaRelance.total).toStrictEqual(estimation().total);
      expect(avecLaRelance.travailRattrape.total).toMatchObject({
        tempsActuelParAn: { enSecondes: 175_716 },
        tempsGagneParAn: { bas: { enSecondes: 140_573 }, haut: { enSecondes: 166_930 } },
      });
    });

    it('compare deux hébergements en coût par heure récupérée sur 3 ans', () => {
      // Gain sur 3 ans : 3 × 623 118 s = 519,3 h à 3 × 952 641 s = 793,9 h.
      // Au bureau : 2 000 + 800 + 36 × 30 = 3 880 € à 2 000 + 800 + 36 × 50 = 4 600 €,
      //   soit 3 880 / 793,9 = 4,89 €/h à 4 600 / 519,3 = 8,86 €/h.
      // Dans le cloud : 1 500 + 36 × 80 = 4 380 € à 1 500 + 36 × 120 = 5 820 €,
      //   soit 4 380 / 793,9 = 5,52 €/h à 5 820 / 519,3 = 11,21 €/h.
      const [auBureau, dansLeCloud] = chiffrerLesOptions(
        [
          uneOption({
            nom: 'Au bureau',
            miseEnPlace: 2_000,
            materiel: 800,
            fraisMensuels: [30, 50],
          }),
          uneOption({
            nom: 'Dans le cloud',
            miseEnPlace: 1_500,
            materiel: 0,
            fraisMensuels: [80, 120],
          }),
        ],
        estimation().total.tempsGagneParAn,
      );

      expect(auBureau?.coutParHeureRecuperee).toMatchObject({
        bas: { enCentimes: 489 },
        haut: { enCentimes: 886 },
      });
      expect(dansLeCloud?.coutParHeureRecuperee).toMatchObject({
        bas: { enCentimes: 552 },
        haut: { enCentimes: 1_121 },
      });
    });

    it('donne les mêmes totaux que deux lignes régulières par processus, en saison et hors saison', () => {
      // Le contournement d'avant la saisonnalité : chaque saison ramenée à une fréquence annuelle.
      const deuxLignes = (
        nom: string,
        duree: number,
        [pointe, reste]: readonly [number, number],
        tauxBas: number,
        tauxHaut: number,
      ) =>
        [pointe, reste].map((nombre, i) =>
          unProcessus({
            nom: `${nom} ${String(i)}`,
            dureeEnSecondes: duree,
            frequence: [nombre, 'an' satisfies Periode],
            personnes: 1,
            tauxBas,
            tauxHaut,
            coutHoraire: aTrenteSixEurosDeLHeure(),
          }),
        );
      const contournement = estimerGains(
        [
          ...deuxLignes('Réponses aux e-mails', 240, [1_300, 1_304], 30, 45),
          ...deuxLignes('Questions récurrentes', 300, [520, 489], 50, 75),
          ...deuxLignes('Commandes aux distributeurs', 900, [156, 97.8], 50, 70),
          ...deuxLignes('Dossiers de primes', 1_500, [104, 65.2], 30, 50),
          ...deuxLignes('Planning des poseurs', HEURE, [39, 32.6], 20, 40),
          ...deuxLignes('Fin de chantier', 600, [52, 48.9], 70, 90),
        ],
        desHypotheses(),
      );

      expect(estimation().total).toStrictEqual(contournement.total);
    });
  });
});
