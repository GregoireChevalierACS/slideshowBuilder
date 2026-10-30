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
import {
  decrireUnExport,
  lireUnExport,
  type ExportDeDiagnostics,
  type ExportIllisible,
  type HistoriqueDeDiagnostic,
} from './echange/exportDeDiagnostics.js';
import type {
  DepotDeDiagnostics,
  GenerateurDIdentifiants,
  Horloge,
  IdDeDiagnostic,
  ResumeDeDiagnostic,
} from './ports.js';
import { decrireLeDiagnostic } from './saisie/decrireLeDiagnostic.js';
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

export interface ResultatDImport {
  readonly id: IdDeDiagnostic;
  /** Le prospect de la dernière version du fichier. */
  readonly prospect: string;
  /**
   * `importe` : nouveau sur ce poste. `complete` : les versions suivantes ont été ajoutées.
   * `aJour` : rien de nouveau. `divergent` : les deux historiques diffèrent, rien n'est importé.
   */
  readonly statut: 'importe' | 'complete' | 'aJour' | 'divergent';
  readonly versionsAjoutees: number;
}

const importer = (
  depot: DepotDeDiagnostics,
  { id, historique }: HistoriqueDeDiagnostic,
): ResultatDImport => {
  // La dernière version donne le nom actuel du prospect.
  const prospect = historique.reduce((_, d) => d.prospect.nom, '');
  const resultat = (statut: ResultatDImport['statut'], versionsAjoutees: number) => ({
    id,
    prospect,
    statut,
    versionsAjoutees,
  });

  const local = depot.historique(id);
  if (local.length === 0) {
    // Créé entre-temps par une autre requête : traité comme un historique différent.
    return depot.importer(id, historique).ok
      ? resultat('importe', historique.length)
      : resultat('divergent', 0);
  }

  // Les versions communes aux deux historiques doivent être identiques, saisie comprise.
  const debut = (versions: readonly Diagnostic[]) =>
    versions
      .slice(0, Math.min(local.length, historique.length))
      .map((d) => JSON.stringify(decrireLeDiagnostic(d)))
      .join('\n');
  if (debut(local) !== debut(historique)) return resultat('divergent', 0);

  const suivantes = historique.slice(local.length);
  if (suivantes.length === 0) return resultat('aJour', 0);
  const ajoutees = suivantes.findIndex((d) => !depot.enregistrer(id, d).ok);
  // Une révision locale s'est intercalée : les versions déjà ajoutées restent valides.
  return ajoutees === -1 ? resultat('complete', suivantes.length) : resultat('divergent', ajoutees);
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

    /** L'historique complet d'un diagnostic, prêt à être enregistré dans un fichier. */
    exporterUnDiagnostic: (
      id: IdDeDiagnostic,
    ): Result<ExportDeDiagnostics, DiagnosticIntrouvable> => {
      const historique = depot.historique(id);
      if (historique.length === 0) return err({ kind: 'DiagnosticIntrouvable', id });
      return ok(decrireUnExport(horloge.aujourdhui(), [{ id, historique }]));
    },

    /** Tous les diagnostics, dans l'ordre de la liste : une sauvegarde complète du poste. */
    exporterLesDiagnostics: (): ExportDeDiagnostics =>
      decrireUnExport(
        horloge.aujourdhui(),
        depot.lister().map(({ id }) => ({ id, historique: depot.historique(id) })),
      ),

    /**
     * Importe un fichier d'export, validé en entier avant la moindre écriture. Un diagnostic déjà
     * présent n'est jamais écrasé : il est complété si son historique local est le début de celui du
     * fichier (le travail a continué sur l'autre poste), laissé tel quel sinon.
     */
    importerDesDiagnostics: (brut: unknown): Result<ResultatDImport[], ExportIllisible> => {
      const lu = lireUnExport(brut);
      if (!lu.ok) return lu;
      return ok(lu.value.map((importe) => importer(depot, importe)));
    },
  };
};

export type CasDUsage = ReturnType<typeof creerLesCasDUsage>;
