// Règles de conception, écrites comme des phrases. Leur description sert telle quelle de
// justification devant le client : modifier une règle, c'est modifier ce que le client lira.

import type { IdDeBrique } from './Brique.js';
import type { ModeDAcces } from './Outil.js';
import type { NatureDeTache, ProfilDAutomatisation } from './ProfilDAutomatisation.js';
import { specification, type Specification } from './Specification.js';

export type NiveauDAutomatisation = 'complete' | 'assistee' | 'notification';

export interface RegleDeBriques {
  readonly quand: Specification<ProfilDAutomatisation>;
  readonly ajoute: readonly IdDeBrique[];
}

export interface RegleDeNiveau {
  readonly quand: Specification<ProfilDAutomatisation>;
  readonly niveau: NiveauDAutomatisation;
}

// --- Vocabulaire ------------------------------------------------------------------------------

const LIBELLES_DE_NATURE: Readonly<Record<NatureDeTache, string>> = {
  saisie: 'une saisie',
  transfert: 'un transfert entre outils',
  'generation-de-document': 'une génération de document',
  tri: 'un tri',
  relance: 'une relance',
  rapprochement: 'un rapprochement',
  reporting: 'un reporting',
  signature: 'une signature de documents',
  paiement: 'un encaissement',
  'prise-de-rendez-vous': 'une prise de rendez-vous',
};

const LIBELLES_D_ACCES: Readonly<Record<ModeDAcces, string>> = {
  api: 'expose une API',
  webhook: 'envoie des webhooks',
  email: 'communique par e-mail',
  export: 'exporte des fichiers',
  aucun: "n'offre aucun accès",
};

const laTacheEst = (...natures: readonly NatureDeTache[]) =>
  specification<ProfilDAutomatisation>(
    `la tâche est ${natures.map((n) => LIBELLES_DE_NATURE[n]).join(' ou ')}`,
    (profil) => natures.includes(profil.nature),
  );

const lOutilSource = (acces: ModeDAcces) =>
  specification<ProfilDAutomatisation>(
    `l'outil source ${LIBELLES_D_ACCES[acces]}`,
    (profil) => profil.source.acces === acces,
  );

const lOutilCible = (acces: ModeDAcces) =>
  specification<ProfilDAutomatisation>(
    `l'outil cible ${LIBELLES_D_ACCES[acces]}`,
    (profil) => profil.cible.acces === acces,
  );

const lesDonneesSontDesDocuments = () =>
  specification<ProfilDAutomatisation>(
    'les données arrivent sous forme de documents (PDF, scans)',
    (profil) => profil.donnees === 'documents',
  );

const uneDecisionEstRequisePourLesExceptions = () =>
  specification<ProfilDAutomatisation>(
    'une décision humaine est nécessaire pour les exceptions',
    (profil) => profil.decisionHumaine === 'ponctuelle',
  );

const chaqueCasDemandeUneDecision = () =>
  specification<ProfilDAutomatisation>(
    'chaque cas demande une décision humaine',
    (profil) => profil.decisionHumaine === 'systematique',
  );

const toujours = (raison: string) => specification<ProfilDAutomatisation>(raison, () => true);

// --- Règles -----------------------------------------------------------------------------------

/** Un seul déclencheur par flux : la première règle satisfaite l'emporte. */
export const reglesDeDeclenchement = (): readonly RegleDeBriques[] => [
  { quand: laTacheEst('relance', 'reporting'), ajoute: ['planificateur'] },
  { quand: laTacheEst('prise-de-rendez-vous'), ajoute: ['formulaire'] },
  { quand: lOutilSource('webhook'), ajoute: ['webhook'] },
  { quand: lOutilSource('email'), ajoute: ['reception-email'] },
  { quand: lOutilSource('export'), ajoute: ['depot-de-fichier'] },
];

/** Quand l'outil source ne signale rien de lui-même. */
export const declenchementParDefaut = (): RegleDeBriques => ({
  quand: toujours("l'outil source est consulté à intervalle régulier"),
  ajoute: ['planificateur'],
});

/** Toutes les règles satisfaites s'appliquent. */
export const reglesDeComposition = (): readonly RegleDeBriques[] => [
  { quand: lOutilSource('api').ou(lOutilSource('webhook')), ajoute: ['api'] },
  { quand: lOutilCible('api').ou(lOutilCible('webhook')), ajoute: ['api'] },
  { quand: lOutilSource('email'), ajoute: ['boite-mail'] },
  { quand: lOutilCible('email'), ajoute: ['boite-mail'] },
  { quand: lOutilSource('export'), ajoute: ['import-export-fichiers'] },
  { quand: lOutilCible('export'), ajoute: ['import-export-fichiers'] },
  { quand: lOutilSource('aucun'), ajoute: ['automatisation-interface'] },
  { quand: lOutilCible('aucun'), ajoute: ['automatisation-interface'] },

  { quand: lesDonneesSontDesDocuments(), ajoute: ['extraction-documents'] },
  { quand: laTacheEst('tri'), ajoute: ['classification-ia'] },
  { quand: laTacheEst('saisie', 'transfert'), ajoute: ['transformation-donnees'] },
  {
    quand: laTacheEst('generation-de-document', 'relance', 'signature'),
    ajoute: ['generation-documents'],
  },
  { quand: laTacheEst('rapprochement', 'paiement'), ajoute: ['rapprochement-regles'] },
  { quand: laTacheEst('reporting'), ajoute: ['agregation-reporting'] },
  { quand: laTacheEst('signature'), ajoute: ['signature-electronique'] },
  { quand: laTacheEst('paiement'), ajoute: ['paiement-en-ligne'] },
  { quand: laTacheEst('prise-de-rendez-vous'), ajoute: ['synchronisation-agenda'] },

  {
    quand: uneDecisionEstRequisePourLesExceptions().ou(chaqueCasDemandeUneDecision()),
    ajoute: ['validation-humaine'],
  },
  { quand: laTacheEst('relance').ou(chaqueCasDemandeUneDecision()), ajoute: ['notification'] },
  {
    quand: toujours('chaque exécution doit être tracée et pouvoir être relancée'),
    ajoute: ['journal-reprise'],
  },
];

/** La première règle satisfaite fixe le niveau : de la plus restrictive à la plus favorable. */
export const reglesDeNiveau = (): readonly RegleDeNiveau[] => [
  { quand: chaqueCasDemandeUneDecision(), niveau: 'notification' },
  { quand: lesDonneesSontDesDocuments(), niveau: 'assistee' },
  { quand: uneDecisionEstRequisePourLesExceptions(), niveau: 'assistee' },
  { quand: lOutilSource('aucun').ou(lOutilCible('aucun')), niveau: 'assistee' },
];

/** Aucune règle restrictive ne s'applique. */
export const niveauParDefaut = (): RegleDeNiveau => ({
  quand: toujours(
    "les données sont structurées, les outils sont intégrables et aucune décision humaine n'est requise",
  ),
  niveau: 'complete',
});
