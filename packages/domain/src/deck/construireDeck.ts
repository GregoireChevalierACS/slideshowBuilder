import type { AlerteDeCoherence } from '../gains/estimerGains.js';
import type { Diagnostic } from '../diagnostic/Diagnostic.js';
import { apparier } from './apparier.js';
import type { Diapositive, ParametresDuDeck } from './Diapositive.js';
import { ordonnerLesChantiers } from './ordonnerLesChantiers.js';

interface Section {
  readonly inclure: (parametres: ParametresDuDeck) => boolean;
  readonly diapositives: () => readonly Diapositive[];
}

const toujours = () => true;
const versionComplete = (p: ParametresDuDeck) => p.duree === 'complete';
const detailTechnique = (p: ParametresDuDeck) => versionComplete(p) && p.public === 'technique';

const noteDAlerte = (alerte: AlerteDeCoherence, heuresAnnuellesTempsPlein: number): string =>
  `À vérifier avant de présenter : « ${alerte.processus} » représenterait ${String(alerte.heuresParPersonneParAn)} h par personne et par an, plus qu’un temps plein (${String(heuresAnnuellesTempsPlein)} h). La fréquence a peut-être été saisie pour toute l’équipe au lieu d’une personne.`;

/**
 * Construit la liste des diapositives d'un diagnostic, selon le public et la durée visés.
 * Pure et déterministe : même diagnostic, mêmes paramètres, même deck.
 */
export const construireDeck = (
  diagnostic: Diagnostic,
  parametres: ParametresDuDeck,
): Diapositive[] => {
  const { estimation, architecture, hypotheses, prospect } = diagnostic;
  const { total } = estimation;
  const sansNotes = { notes: [] } as const;

  const sections: readonly Section[] = [
    {
      inclure: toujours,
      diapositives: () => [
        {
          kind: 'Titre',
          titre: 'Automatiser vos tâches répétitives',
          prospect: prospect.nom,
          date: diagnostic.dateDEntretien.enToutesLettres,
          version: diagnostic.version,
          // Le présentateur voit les alertes avant de commencer, le client jamais.
          notes: estimation.alertes.map((alerte) =>
            noteDAlerte(alerte, hypotheses.heuresAnnuellesTempsPlein),
          ),
        },
      ],
    },
    {
      inclure: versionComplete,
      diapositives: () => [
        {
          kind: 'Observation',
          secteur: prospect.secteur,
          effectifTotal: prospect.effectifTotal?.personnes,
          outils: architecture.outils,
          processus: diagnostic.processus.map(({ processus }) => processus.nom),
          ...sansNotes,
        },
      ],
    },
    {
      inclure: toujours,
      diapositives: () => [
        {
          kind: 'CoutCache',
          tempsActuelParAn: total.tempsActuelParAn,
          valeurActuelleParAn: total.valeurActuelleParAn,
          equivalentsTempsPleinActuels: total.equivalentsTempsPleinActuels,
          nombreDeProcessus: diagnostic.processus.length,
          ...sansNotes,
        },
      ],
    },
    {
      inclure: versionComplete,
      diapositives: () => [
        { kind: 'TableauDesProcessus', lignes: estimation.parProcessus, total, ...sansNotes },
      ],
    },
    {
      inclure: toujours,
      diapositives: () => [
        {
          kind: 'Architecture',
          detail: parametres.public === 'dirigeant' ? 'familles' : 'briques',
          outils: architecture.outils,
          briques: architecture.briques,
          utiliseIA: architecture.utiliseIA,
          ...sansNotes,
        },
      ],
    },
    {
      inclure: detailTechnique,
      diapositives: () =>
        architecture.solutions.map(({ nom, solution }) => ({
          kind: 'SolutionDUnProcessus',
          processus: nom,
          solution,
          ...sansNotes,
        })),
    },
    {
      inclure: toujours,
      diapositives: () => [
        {
          kind: 'GainsAttendus',
          total,
          parProcessus: estimation.parProcessus.map((ligne) => ({
            processus: ligne.processus.nom,
            valeurGagneeParAn: ligne.valeurGagneeParAn,
          })),
          ...sansNotes,
        },
      ],
    },
    {
      inclure: toujours,
      diapositives: () => [
        {
          kind: 'FeuilleDeRoute',
          // Gains et solutions sont produits dans l'ordre des processus du diagnostic.
          chantiers: ordonnerLesChantiers(
            apparier(estimation.parProcessus, architecture.solutions).map(
              ([gain, { nom, solution }]) => ({
                nom,
                niveau: solution.niveau,
                valeurGagneeParAn: gain.valeurGagneeParAn,
              }),
            ),
          ),
          ...sansNotes,
        },
      ],
    },
    {
      inclure: versionComplete,
      diapositives: () => [
        {
          kind: 'Hypotheses',
          hypotheses,
          coutsHoraires: diagnostic.processus.map(({ processus }) => ({
            processus: processus.nom,
            coutHoraire: processus.coutHoraire,
          })),
          ...sansNotes,
        },
      ],
    },
  ];

  return sections
    .filter((section) => section.inclure(parametres))
    .flatMap((section) => section.diapositives());
};
