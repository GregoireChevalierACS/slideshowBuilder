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

/** L'effet commercial d'une tâche reprise se dit, il ne se chiffre pas dans le calcul. */
const noteDeTravailRattrape = (processus: string): string =>
  `« ${processus} » n’est plus fait aujourd’hui : son temps n’entre ni dans le coût caché ni dans le gain. L’automatiser le remet en place ; l’effet commercial (devis signés, clients relancés) est à évoquer, il n’est pas chiffré.`;

/** Pour répondre à « d'où vient ce chiffre ? » sans le surcharger à l'écran. */
export const NOTE_DU_COUT_PAR_HEURE =
  'Coût par heure récupérée = (mise en place + matériel + 36 mois de frais) ÷ heures gagnées sur 3 ans. La fourchette va des frais bas avec le gain haut aux frais hauts avec le gain bas. Seules les tâches faites aujourd’hui comptent dans les heures gagnées.';

/**
 * Gains et solutions sont produits dans l'ordre des processus du diagnostic, les tâches faites et
 * les tâches abandonnées chacune de leur côté : on les apparie dans le même partage.
 */
const chantiersDuDiagnostic = ({ processus, architecture, estimation }: Diagnostic) => {
  const solutions = apparier(processus, architecture.solutions);
  const de = (abandonne: boolean) =>
    solutions.filter(([{ processus: p }]) => p.abandonne === abandonne).map(([, s]) => s);
  return [
    ...apparier(estimation.parProcessus, de(false)),
    ...apparier(estimation.travailRattrape.parProcessus, de(true)),
  ].map(([gain, { nom, solution }]) => ({
    nom,
    niveau: solution.niveau,
    valeurGagneeParAn: gain.valeurGagneeParAn,
  }));
};

/**
 * Construit la liste des diapositives d'un diagnostic, selon le public et la durée visés.
 * Pure et déterministe : même diagnostic, mêmes paramètres, même deck.
 */
export const construireDeck = (
  diagnostic: Diagnostic,
  parametres: ParametresDuDeck,
): Diapositive[] => {
  const { estimation, architecture, hypotheses, prospect, coutDesOptions } = diagnostic;
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
          // Les tâches abandonnées ne coûtent rien aujourd'hui : elles ne comptent pas ici.
          nombreDeProcessus: estimation.parProcessus.length,
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
          travailRattrape: estimation.travailRattrape.parProcessus.map((ligne) => ({
            processus: ligne.processus.nom,
            tempsNecessaireParAn: ligne.tempsActuelParAn,
            tempsRattrapeParAn: ligne.tempsGagneParAn,
          })),
          notes: estimation.travailRattrape.parProcessus.map((ligne) =>
            noteDeTravailRattrape(ligne.processus.nom),
          ),
        },
      ],
    },
    {
      // Seulement quand des options ont été saisies : sans elles, rien à comparer.
      inclure: toujours,
      diapositives: () =>
        coutDesOptions.length === 0
          ? []
          : [
              {
                kind: 'Options',
                tempsGagneParAn: total.tempsGagneParAn,
                options: coutDesOptions,
                notes: [NOTE_DU_COUT_PAR_HEURE],
              },
            ],
    },
    {
      inclure: toujours,
      diapositives: () => [
        {
          kind: 'FeuilleDeRoute',
          // Toutes les tâches sont des chantiers : une tâche abandonnée vaut ce qu'elle rattrape.
          chantiers: ordonnerLesChantiers(chantiersDuDiagnostic(diagnostic)),
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
