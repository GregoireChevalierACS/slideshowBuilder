import type { SaisieDeDiagnostic } from '@slideshow/application';
import type {
  CategorieDOutil,
  DecisionHumaine,
  DureeDePresentation,
  FormeDesDonnees,
  ModeDAcces,
  NatureDeTache,
  Periode,
  PublicVise,
} from '@slideshow/domain';
import { z } from 'zod';

// Validation de structure (types, champs présents, choix fermés) : le premier des trois niveaux.
// Les règles métier (bornes, cohérence) restent au domaine.

/**
 * Énumération qui doit lister exactement les choix du domaine : une valeur ajoutée au domaine et
 * oubliée ici casse la compilation au lieu de refuser silencieusement une saisie valide.
 */
const choixDuDomaine =
  <T extends string>() =>
  <const V extends readonly [T, ...T[]]>(
    valeurs: V & ([T] extends [V[number]] ? unknown : { erreur: 'choix manquant' }),
  ) =>
    z.enum(valeurs);

const entier = z.number().int();
const texte = z.string().max(200);

const schemaDOutil = z.strictObject({
  nom: texte,
  categorie: choixDuDomaine<CategorieDOutil>()([
    'messagerie',
    'comptabilite',
    'facturation',
    'crm',
    'tableur',
    'stockage',
    'intranet',
    'messagerie-instantanee',
    'agenda',
    'banque',
    'autre',
  ]),
  acces: choixDuDomaine<ModeDAcces>()(['api', 'webhook', 'email', 'export', 'aucun']),
});

const schemaDeCoutHoraire = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('Direct'), centimesParHeure: entier }),
  z.strictObject({
    kind: z.literal('DepuisSalaireBrutAnnuel'),
    brutAnnuelEnCentimes: entier,
    coefficientDeCharges: entier,
  }),
]);

const schemaDeProcessus = z.strictObject({
  nom: texte,
  dureeUnitaireEnSecondes: entier,
  frequence: z.strictObject({
    nombre: entier,
    periode: choixDuDomaine<Periode>()(['jour', 'semaine', 'mois', 'an']),
  }),
  personnes: entier,
  tauxBas: entier,
  tauxHaut: entier,
  coutHoraire: schemaDeCoutHoraire,
  profil: z.strictObject({
    nature: choixDuDomaine<NatureDeTache>()([
      'saisie',
      'transfert',
      'generation-de-document',
      'tri',
      'relance',
      'rapprochement',
      'reporting',
      'signature',
      'paiement',
      'prise-de-rendez-vous',
    ]),
    source: schemaDOutil,
    cible: schemaDOutil,
    donnees: choixDuDomaine<FormeDesDonnees>()(['structurees', 'documents']),
    decisionHumaine: choixDuDomaine<DecisionHumaine>()(['aucune', 'ponctuelle', 'systematique']),
  }),
});

export const schemaDeProspect = z.strictObject({
  nom: texte,
  secteur: texte.exactOptional(),
  effectifTotal: entier.exactOptional(),
});

const champsRevisables = {
  prospect: schemaDeProspect,
  hypotheses: z.strictObject({
    joursTravaillesParAn: entier,
    heuresAnnuellesTempsPlein: entier,
  }),
  processus: z.array(schemaDeProcessus).max(100),
};

export const schemaDeSaisieDeDiagnostic = z.strictObject({
  ...champsRevisables,
  dateDEntretien: z.string(),
}) satisfies z.ZodType<SaisieDeDiagnostic>;

export const schemaDeRevision = z.strictObject({
  ...champsRevisables,
  /** La version que l'utilisateur a sous les yeux (concurrence optimiste). */
  versionAttendue: entier,
});

export const schemaDesParametresDuDeck = z.strictObject({
  public: choixDuDomaine<PublicVise>()(['dirigeant', 'technique']),
  duree: choixDuDomaine<DureeDePresentation>()(['courte', 'complete']),
  version: z.coerce.number().int().exactOptional(),
});

export const schemaDeVersion = z.strictObject({
  version: z.coerce.number().int().exactOptional(),
});
