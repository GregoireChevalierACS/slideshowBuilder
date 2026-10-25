// Scénarios de référence : des entreprises réalistes, dont les chiffres attendus sont calculés à la
// main (détail en commentaire). Ils servent de critère d'acceptation au calcul des gains : si l'un
// d'eux change, c'est le pitch présenté au client qui change.
//
// Astuce de lecture : à 36 €/h, une seconde coûte exactement 1 centime, donc la valeur en centimes
// est égale au temps en secondes.

import { describe, expect, it } from 'vitest';
import { desHypotheses, unMontant, unProcessus } from '../testing/fabriques.js';
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
});
