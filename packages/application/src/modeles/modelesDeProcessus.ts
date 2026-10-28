import {
  concevoirSolution,
  err,
  ok,
  Outil,
  type CategorieDOutil,
  type DecisionHumaine,
  type FormeDesDonnees,
  type NatureDeTache,
  type NiveauDAutomatisation,
  type Periode,
  type Result,
} from '@slideshow/domain';
import type { SaisieInvalide } from '../saisie/lireLaSaisie.js';
import type {
  SaisieDeCoutHoraire,
  SaisieDeProcessus,
  SaisieDOutil,
} from '../saisie/SaisieDeDiagnostic.js';

/**
 * Point de départ d'un processus fréquent : ce qui ne dépend pas du client. Les outils, l'effectif
 * et le coût viennent de l'entretien ; les taux, de la conception.
 */
export interface ModeleDeProcessus {
  readonly id: string;
  readonly nom: string;
  readonly nature: NatureDeTache;
  readonly donnees: FormeDesDonnees;
  readonly decisionHumaine: DecisionHumaine;
  /** Ordres de grandeur observés, à ajuster avec le client. */
  readonly dureeUnitaireEnSecondes: number;
  readonly frequence: { readonly nombre: number; readonly periode: Periode };
  /** Pour proposer en premier les outils de la bonne catégorie. */
  readonly categorieSource: CategorieDOutil;
  readonly categorieCible: CategorieDOutil;
}

const MINUTE = 60;
const HEURE = 60 * MINUTE;

export const MODELES_DE_PROCESSUS: readonly ModeleDeProcessus[] = [
  {
    id: 'saisie-factures-fournisseurs',
    nom: 'Saisie des factures fournisseurs',
    nature: 'saisie',
    donnees: 'documents',
    decisionHumaine: 'ponctuelle',
    dureeUnitaireEnSecondes: 4 * MINUTE,
    frequence: { nombre: 20, periode: 'jour' },
    categorieSource: 'messagerie',
    categorieCible: 'comptabilite',
  },
  {
    id: 'relances-impayes',
    nom: 'Relances des impayés',
    nature: 'relance',
    donnees: 'structurees',
    decisionHumaine: 'aucune',
    dureeUnitaireEnSecondes: 10 * MINUTE,
    frequence: { nombre: 15, periode: 'semaine' },
    categorieSource: 'comptabilite',
    categorieCible: 'messagerie',
  },
  {
    id: 'devis-crm',
    nom: 'Devis depuis le CRM',
    nature: 'generation-de-document',
    donnees: 'structurees',
    decisionHumaine: 'ponctuelle',
    dureeUnitaireEnSecondes: 20 * MINUTE,
    frequence: { nombre: 5, periode: 'jour' },
    categorieSource: 'crm',
    categorieCible: 'facturation',
  },
  {
    id: 'tri-mails',
    nom: 'Tri des mails entrants',
    nature: 'tri',
    donnees: 'structurees',
    decisionHumaine: 'aucune',
    dureeUnitaireEnSecondes: MINUTE,
    frequence: { nombre: 60, periode: 'jour' },
    categorieSource: 'messagerie',
    categorieCible: 'messagerie',
  },
  {
    id: 'rapprochement-bancaire',
    nom: 'Rapprochement bancaire',
    nature: 'rapprochement',
    donnees: 'structurees',
    decisionHumaine: 'ponctuelle',
    dureeUnitaireEnSecondes: 2 * MINUTE,
    frequence: { nombre: 30, periode: 'jour' },
    categorieSource: 'banque',
    categorieCible: 'comptabilite',
  },
  {
    id: 'reporting-mensuel',
    nom: 'Reporting mensuel',
    nature: 'reporting',
    donnees: 'structurees',
    decisionHumaine: 'aucune',
    dureeUnitaireEnSecondes: 3 * HEURE,
    frequence: { nombre: 1, periode: 'mois' },
    categorieSource: 'tableur',
    categorieCible: 'tableur',
  },
  {
    id: 'prise-de-rendez-vous',
    nom: 'Prise de rendez-vous',
    nature: 'prise-de-rendez-vous',
    donnees: 'structurees',
    decisionHumaine: 'aucune',
    dureeUnitaireEnSecondes: 5 * MINUTE,
    frequence: { nombre: 10, periode: 'jour' },
    categorieSource: 'messagerie',
    categorieCible: 'agenda',
  },
  {
    id: 'contrats-a-signer',
    nom: 'Envoi de contrats à signer',
    nature: 'signature',
    donnees: 'structurees',
    decisionHumaine: 'ponctuelle',
    dureeUnitaireEnSecondes: 15 * MINUTE,
    frequence: { nombre: 3, periode: 'semaine' },
    categorieSource: 'crm',
    categorieCible: 'stockage',
  },
  {
    id: 'notes-de-frais',
    nom: 'Notes de frais',
    nature: 'saisie',
    donnees: 'documents',
    decisionHumaine: 'ponctuelle',
    dureeUnitaireEnSecondes: 5 * MINUTE,
    frequence: { nombre: 8, periode: 'mois' },
    categorieSource: 'messagerie',
    categorieCible: 'comptabilite',
  },
  {
    id: 'commandes-fournisseurs',
    nom: 'Commandes fournisseurs',
    nature: 'generation-de-document',
    donnees: 'structurees',
    decisionHumaine: 'ponctuelle',
    dureeUnitaireEnSecondes: 15 * MINUTE,
    frequence: { nombre: 3, periode: 'semaine' },
    categorieSource: 'tableur',
    categorieCible: 'messagerie',
  },
  {
    id: 'variables-de-paie',
    nom: 'Transmission des variables de paie',
    nature: 'transfert',
    donnees: 'structurees',
    decisionHumaine: 'ponctuelle',
    dureeUnitaireEnSecondes: 4 * HEURE,
    frequence: { nombre: 1, periode: 'mois' },
    categorieSource: 'tableur',
    categorieCible: 'comptabilite',
  },
  {
    id: 'crm-apres-rendez-vous',
    nom: 'Mise à jour du CRM après rendez-vous',
    nature: 'saisie',
    donnees: 'structurees',
    decisionHumaine: 'aucune',
    dureeUnitaireEnSecondes: 10 * MINUTE,
    frequence: { nombre: 3, periode: 'jour' },
    categorieSource: 'messagerie',
    categorieCible: 'crm',
  },
  {
    id: 'relance-devis',
    nom: 'Relance des devis non signés',
    nature: 'relance',
    donnees: 'structurees',
    decisionHumaine: 'aucune',
    dureeUnitaireEnSecondes: 5 * MINUTE,
    frequence: { nombre: 10, periode: 'semaine' },
    categorieSource: 'crm',
    categorieCible: 'messagerie',
  },
];

export interface SuggestionDeTaux {
  readonly niveau: NiveauDAutomatisation;
  readonly tauxBas: number;
  readonly tauxHaut: number;
}

const lireLOutil = (saisie: SaisieDOutil, champ: string): Result<Outil, SaisieInvalide> => {
  const outil = Outil.creer(saisie);
  return outil.ok ? outil : err({ kind: 'SaisieInvalide', champ, erreur: outil.error });
};

/** Les taux que la conception (phase 2) propose pour ce profil, à pré-remplir dans l'entretien. */
export const suggererLesTaux = (
  profil: SaisieDeProcessus['profil'],
): Result<SuggestionDeTaux, SaisieInvalide> => {
  const source = lireLOutil(profil.source, 'profil.source');
  if (!source.ok) return source;
  const cible = lireLOutil(profil.cible, 'profil.cible');
  if (!cible.ok) return cible;

  const { niveau, tauxSuggeres } = concevoirSolution({
    ...profil,
    source: source.value,
    cible: cible.value,
  });
  return ok({ niveau, tauxBas: tauxSuggeres.bas.valeur, tauxHaut: tauxSuggeres.haut.valeur });
};

/** Crée la saisie d'un processus à partir d'un modèle et des choix faits pendant l'entretien. */
export const appliquerLeModele = (
  modele: ModeleDeProcessus,
  choix: {
    readonly source: SaisieDOutil;
    readonly cible: SaisieDOutil;
    readonly personnes: number;
    readonly coutHoraire: SaisieDeCoutHoraire;
  },
): Result<SaisieDeProcessus, SaisieInvalide> => {
  const profil = {
    nature: modele.nature,
    source: choix.source,
    cible: choix.cible,
    donnees: modele.donnees,
    decisionHumaine: modele.decisionHumaine,
  };
  const suggestion = suggererLesTaux(profil);
  if (!suggestion.ok) return suggestion;

  return ok({
    nom: modele.nom,
    dureeUnitaireEnSecondes: modele.dureeUnitaireEnSecondes,
    frequence: modele.frequence,
    personnes: choix.personnes,
    tauxBas: suggestion.value.tauxBas,
    tauxHaut: suggestion.value.tauxHaut,
    coutHoraire: choix.coutHoraire,
    profil,
  });
};
