export type FamilleDeBrique = 'declencheur' | 'connecteur' | 'traitement' | 'service' | 'controle';

interface DefinitionDeBrique {
  readonly famille: FamilleDeBrique;
  readonly nom: string;
  /** Une phrase compréhensible par un dirigeant non technicien. */
  readonly description: string;
  /** Affiché sur la diapositive : le client doit savoir où intervient l'IA. */
  readonly utiliseIA: boolean;
}

// L'ordre suit la lecture d'un flux : ce qui déclenche, ce qui lit et écrit, ce qui transforme, les
// services externes, puis le contrôle. Il sert tel quel à l'affichage.
const DEFINITIONS = {
  planificateur: {
    famille: 'declencheur',
    nom: 'Planificateur',
    description:
      'Lance le traitement à heure fixe : chaque nuit, chaque lundi, chaque fin de mois.',
    utiliseIA: false,
  },
  'reception-email': {
    famille: 'declencheur',
    nom: "Réception d'e-mail",
    description: "Lance le traitement dès qu'un e-mail arrive dans une boîte surveillée.",
    utiliseIA: false,
  },
  webhook: {
    famille: 'declencheur',
    nom: 'Webhook',
    description: 'Lance le traitement dès que le logiciel source signale un événement.',
    utiliseIA: false,
  },
  'depot-de-fichier': {
    famille: 'declencheur',
    nom: 'Dépôt de fichier',
    description: "Lance le traitement dès qu'un fichier est déposé dans un dossier partagé.",
    utiliseIA: false,
  },
  formulaire: {
    famille: 'declencheur',
    nom: 'Formulaire',
    description: 'Lance le traitement à la soumission d’un formulaire en ligne.',
    utiliseIA: false,
  },
  api: {
    famille: 'connecteur',
    nom: 'Connecteur API',
    description: 'Lit et écrit directement dans le logiciel par son interface de programmation.',
    utiliseIA: false,
  },
  'boite-mail': {
    famille: 'connecteur',
    nom: 'Connecteur de messagerie',
    description: 'Lit, classe et envoie des e-mails (IMAP et SMTP).',
    utiliseIA: false,
  },
  'import-export-fichiers': {
    famille: 'connecteur',
    nom: 'Import et export de fichiers',
    description: 'Échange les données par fichiers CSV ou Excel produits ou lus par le logiciel.',
    utiliseIA: false,
  },
  'automatisation-interface': {
    famille: 'connecteur',
    nom: "Automatisation d'interface (RPA)",
    description:
      "Reproduit les clics d'un utilisateur quand le logiciel n'offre aucun autre accès. Dernier recours : fragile aux mises à jour.",
    utiliseIA: false,
  },
  'extraction-documents': {
    famille: 'traitement',
    nom: 'Extraction de documents (OCR et IA)',
    description:
      'Lit les factures, bons et scans pour en extraire les montants, dates et références.',
    utiliseIA: true,
  },
  'classification-ia': {
    famille: 'traitement',
    nom: 'Classification par IA',
    description: 'Trie les e-mails et documents par nature et par urgence, et les oriente.',
    utiliseIA: true,
  },
  'transformation-donnees': {
    famille: 'traitement',
    nom: 'Transformation de données',
    description: "Convertit et complète les données d'un logiciel au format attendu par l'autre.",
    utiliseIA: false,
  },
  'generation-documents': {
    famille: 'traitement',
    nom: 'Génération de documents',
    description: 'Produit devis, factures, courriers et contrats à partir de modèles.',
    utiliseIA: false,
  },
  'rapprochement-regles': {
    famille: 'traitement',
    nom: 'Rapprochement par règles',
    description: 'Associe automatiquement paiements, factures et commandes selon des règles.',
    utiliseIA: false,
  },
  'agregation-reporting': {
    famille: 'traitement',
    nom: 'Agrégation et reporting',
    description: 'Consolide les chiffres de plusieurs sources dans un tableau de bord à jour.',
    utiliseIA: false,
  },
  'signature-electronique': {
    famille: 'service',
    nom: 'Signature électronique',
    description: 'Envoie les documents à signer et récupère les versions signées.',
    utiliseIA: false,
  },
  'paiement-en-ligne': {
    famille: 'service',
    nom: 'Paiement en ligne',
    description: 'Ajoute un lien de paiement aux factures et enregistre les règlements reçus.',
    utiliseIA: false,
  },
  'synchronisation-agenda': {
    famille: 'service',
    nom: "Synchronisation d'agenda",
    description: 'Crée et met à jour les rendez-vous dans les agendas concernés.',
    utiliseIA: false,
  },
  'validation-humaine': {
    famille: 'controle',
    nom: 'Validation humaine',
    description: 'Soumet les cas incertains à une personne avant toute action irréversible.',
    utiliseIA: false,
  },
  notification: {
    famille: 'controle',
    nom: 'Notification',
    description: 'Prévient les bonnes personnes par e-mail ou messagerie instantanée.',
    utiliseIA: false,
  },
  'journal-reprise': {
    famille: 'controle',
    nom: 'Journal et reprise sur erreur',
    description: 'Trace chaque exécution et relance automatiquement ce qui a échoué.',
    utiliseIA: false,
  },
} as const satisfies Record<string, DefinitionDeBrique>;

export type IdDeBrique = keyof typeof DEFINITIONS;

export interface Brique extends DefinitionDeBrique {
  readonly id: IdDeBrique;
}

const enBrique = (id: IdDeBrique): Brique => ({ id, ...DEFINITIONS[id] });

// Object.keys est typé string[] : le garde de type redonne le type des clés sans cast.
export const CATALOGUE_DE_BRIQUES: readonly Brique[] = Object.keys(DEFINITIONS)
  .filter((id): id is IdDeBrique => id in DEFINITIONS)
  .map(enBrique);

export const brique = (id: IdDeBrique): Brique => enBrique(id);
