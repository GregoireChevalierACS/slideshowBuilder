import type {
  CategorieDOutil,
  DecisionHumaine,
  FormeDesDonnees,
  ModeDAcces,
  NatureDeTache,
  NiveauDAutomatisation,
  Periode,
} from '@slideshow/domain';

// Les libellés des choix fermés du domaine. Typés Record : un choix ajouté au domaine sans libellé
// casse la compilation de l'interface.

type Choix<V extends string> = readonly (readonly [V, string])[];

// Object.entries est typé [string, …][] : le garde de type redonne le type des clés sans cast.
const enChoix = <V extends string>(libelles: Readonly<Record<V, string>>): Choix<V> =>
  Object.entries<string>(libelles).filter((entree): entree is [V, string] => entree[0] in libelles);

export const LIBELLES_DES_PERIODES: Readonly<Record<Periode, string>> = {
  jour: 'par jour travaillé',
  semaine: 'par semaine',
  mois: 'par mois',
  an: 'par an',
};

export const LIBELLES_DES_NATURES: Readonly<Record<NatureDeTache, string>> = {
  saisie: 'Saisie',
  transfert: 'Transfert entre outils',
  'generation-de-document': 'Génération de document',
  tri: 'Tri',
  relance: 'Relance',
  rapprochement: 'Rapprochement',
  reporting: 'Reporting',
  signature: 'Signature de documents',
  paiement: 'Encaissement',
  'prise-de-rendez-vous': 'Prise de rendez-vous',
};

export const LIBELLES_DES_ACCES: Readonly<Record<ModeDAcces, string>> = {
  api: 'API',
  webhook: 'Webhook',
  email: 'E-mail',
  export: 'Export de fichiers',
  aucun: 'Aucun accès',
};

export const LIBELLES_DES_CATEGORIES: Readonly<Record<CategorieDOutil, string>> = {
  messagerie: 'Messagerie',
  comptabilite: 'Comptabilité',
  facturation: 'Facturation / ERP',
  crm: 'CRM',
  tableur: 'Tableur',
  stockage: 'Stockage de fichiers',
  intranet: 'Intranet',
  'messagerie-instantanee': 'Messagerie instantanée',
  agenda: 'Agenda',
  banque: 'Banque',
  autre: 'Autre',
};

export const LIBELLES_DES_DONNEES: Readonly<Record<FormeDesDonnees, string>> = {
  structurees: 'Structurées',
  documents: 'Documents (PDF, scans)',
};

export const LIBELLES_DES_DECISIONS: Readonly<Record<DecisionHumaine, string>> = {
  aucune: 'Aucune',
  ponctuelle: 'Pour les exceptions',
  systematique: 'À chaque fois',
};

export const LIBELLES_DES_NIVEAUX: Readonly<Record<NiveauDAutomatisation, string>> = {
  complete: 'automatisation complète',
  assistee: 'automatisation assistée',
  notification: 'préparation et notification',
};

export const CHOIX_DES_PERIODES = enChoix(LIBELLES_DES_PERIODES);
export const CHOIX_DES_NATURES = enChoix(LIBELLES_DES_NATURES);
export const CHOIX_DES_ACCES = enChoix(LIBELLES_DES_ACCES);
export const CHOIX_DES_CATEGORIES = enChoix(LIBELLES_DES_CATEGORIES);
export const CHOIX_DES_DONNEES = enChoix(LIBELLES_DES_DONNEES);
export const CHOIX_DES_DECISIONS = enChoix(LIBELLES_DES_DECISIONS);
