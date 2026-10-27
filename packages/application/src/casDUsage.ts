import {
  construireDeck,
  err,
  HypothesesDeCalcul,
  ok,
  type Diagnostic,
  type Diapositive,
  type ParametresDuDeck,
  type Result,
} from '@slideshow/domain';
import type {
  DepotDeDiagnostics,
  GenerateurDIdentifiants,
  Horloge,
  IdDeDiagnostic,
  ResumeDeDiagnostic,
} from './ports.js';
import { lireLaSaisie, type SaisieInvalide } from './saisie/lireLaSaisie.js';
import type { SaisieDeDiagnostic } from './saisie/SaisieDeDiagnostic.js';

export interface DiagnosticIntrouvable {
  readonly kind: 'DiagnosticIntrouvable';
  readonly id: IdDeDiagnostic;
}

export interface VersionIntrouvable {
  readonly kind: 'VersionIntrouvable';
  readonly id: IdDeDiagnostic;
  readonly version: number;
}

/** La version révisée n'est plus la dernière : quelqu'un d'autre a enregistré entre-temps. */
export interface VersionPerimee {
  readonly kind: 'VersionPerimee';
  readonly id: IdDeDiagnostic;
  readonly versionAttendue: number;
  readonly versionActuelle: number;
}

export interface Dependances {
  readonly depot: DepotDeDiagnostics;
  readonly horloge: Horloge;
  readonly identifiants: GenerateurDIdentifiants;
}

/** Tout ce qu'on révise, sauf la date de l'entretien. */
export type ModificationsDuDiagnostic = Omit<SaisieDeDiagnostic, 'dateDEntretien'>;

const hypothesesParDefaut = (): SaisieDeDiagnostic['hypotheses'] => {
  const { joursTravaillesParAn, heuresAnnuellesTempsPlein } = HypothesesDeCalcul.parDefaut();
  return { joursTravaillesParAn, heuresAnnuellesTempsPlein };
};

/** Composition des cas d'usage : les dépendances sont injectées, jamais importées. */
export const creerLesCasDUsage = ({ depot, horloge, identifiants }: Dependances) => {
  const consulterUnDiagnostic = (
    id: IdDeDiagnostic,
    version?: number,
  ): Result<Diagnostic, DiagnosticIntrouvable | VersionIntrouvable> => {
    const derniere = depot.derniereVersion(id);
    if (derniere === undefined) return err({ kind: 'DiagnosticIntrouvable', id });
    if (version === undefined) return ok(derniere);
    const demandee = depot.version(id, version);
    return demandee === undefined ? err({ kind: 'VersionIntrouvable', id, version }) : ok(demandee);
  };

  return {
    /** Commence un entretien : version 1, datée du jour, sans processus. */
    ouvrirUnDiagnostic: (
      prospect: SaisieDeDiagnostic['prospect'],
    ): Result<{ readonly id: IdDeDiagnostic; readonly diagnostic: Diagnostic }, SaisieInvalide> => {
      const diagnostic = lireLaSaisie(
        {
          prospect,
          dateDEntretien: horloge.aujourdhui().iso,
          hypotheses: hypothesesParDefaut(),
          processus: [],
        },
        1,
      );
      if (!diagnostic.ok) return diagnostic;

      const id = identifiants.nouvelIdentifiant();
      if (!depot.enregistrer(id, diagnostic.value).ok) {
        // Un identifiant neuf déjà pris ne peut venir que d'un générateur défaillant.
        throw new Error(`Identifiant déjà utilisé à la création : ${id}`);
      }
      return ok({ id, diagnostic: diagnostic.value });
    },

    /**
     * Enregistre la version suivante. `versionAttendue` est celle que l'utilisateur a sous les yeux :
     * si ce n'est plus la dernière, la révision est refusée plutôt que d'écraser un autre travail.
     */
    reviserUnDiagnostic: (
      id: IdDeDiagnostic,
      versionAttendue: number,
      modifications: ModificationsDuDiagnostic,
    ): Result<Diagnostic, DiagnosticIntrouvable | VersionPerimee | SaisieInvalide> => {
      const actuel = depot.derniereVersion(id);
      if (actuel === undefined) return err({ kind: 'DiagnosticIntrouvable', id });
      const perimee = (versionActuelle: number) =>
        err({ kind: 'VersionPerimee', id, versionAttendue, versionActuelle } as const);
      if (actuel.version !== versionAttendue) return perimee(actuel.version);

      // La date de l'entretien vient de la version actuelle : elle ne se révise pas.
      const revise = lireLaSaisie(
        { ...modifications, dateDEntretien: actuel.dateDEntretien.iso },
        actuel.version + 1,
      );
      if (!revise.ok) return revise;

      const enregistrement = depot.enregistrer(id, revise.value);
      // La version que nous voulions écrire vient d'être enregistrée par une autre révision.
      return enregistrement.ok ? revise : perimee(enregistrement.error.version);
    },

    consulterUnDiagnostic,

    genererLeDeck: (
      id: IdDeDiagnostic,
      parametres: ParametresDuDeck,
      version?: number,
    ): Result<Diapositive[], DiagnosticIntrouvable | VersionIntrouvable> => {
      const diagnostic = consulterUnDiagnostic(id, version);
      return diagnostic.ok ? ok(construireDeck(diagnostic.value, parametres)) : diagnostic;
    },

    listerLesDiagnostics: (): readonly ResumeDeDiagnostic[] => depot.lister(),
  };
};

export type CasDUsage = ReturnType<typeof creerLesCasDUsage>;
