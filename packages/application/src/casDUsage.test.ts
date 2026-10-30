import { construireDeck, type Diagnostic } from '@slideshow/domain';
import { describe, expect, it } from 'vitest';
import { creerLesCasDUsage } from './casDUsage.js';
import {
  lireUnIdDeDiagnostic,
  type GenerateurDIdentifiants,
  type IdDeDiagnostic,
} from './ports.js';
import { decrireLeDiagnostic } from './saisie/decrireLeDiagnostic.js';
import type { SaisieDeDiagnostic } from './saisie/SaisieDeDiagnostic.js';
import { DepotEnMemoire } from './testing/DepotEnMemoire.js';
import { HorlogeFixe, IdentifiantsSequentiels } from './testing/fakes.js';
import { uneSaisieDeProcessus } from './testing/saisies.js';

const id = (texte: string): IdDeDiagnostic => {
  const lu = lireUnIdDeDiagnostic(texte);
  if (!lu.ok) throw new Error(texte);
  return lu.value;
};

const valeur = <T>(resultat: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!resultat.ok) throw new Error(`échec inattendu : ${JSON.stringify(resultat.error)}`);
  return resultat.value;
};

const preparer = (identifiants: GenerateurDIdentifiants = new IdentifiantsSequentiels()) => {
  const depot = new DepotEnMemoire();
  const casDUsage = creerLesCasDUsage({
    depot,
    horloge: new HorlogeFixe('2026-10-27'),
    identifiants,
  });
  return { depot, ...casDUsage };
};

/** La saisie complète d'une révision, sans la date (qui ne se révise pas). */
const modifications = (diagnostic: Diagnostic): Omit<SaisieDeDiagnostic, 'dateDEntretien'> => {
  const { prospect, hypotheses, processus } = decrireLeDiagnostic(diagnostic);
  return { prospect, hypotheses, processus };
};

/** Simule une révision concurrente écrite entre notre lecture et notre écriture. */
class DepotEnCourse extends DepotEnMemoire {
  constructor(private readonly ecritureConcurrente: (depot: DepotEnMemoire) => void) {
    super();
  }

  override derniereVersion(identifiant: IdDeDiagnostic): Diagnostic | undefined {
    const lue = super.derniereVersion(identifiant);
    if (lue !== undefined) this.ecritureConcurrente(this);
    return lue;
  }
}

describe('cas d’usage', () => {
  describe('ouvrir un diagnostic', () => {
    it('crée la version 1, datée du jour, avec les hypothèses par défaut et sans processus', () => {
      const { ouvrirUnDiagnostic } = preparer();

      const { id: identifiant, diagnostic } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));

      expect(identifiant).toBe('diagnostic-1');
      expect(decrireLeDiagnostic(diagnostic)).toStrictEqual({
        prospect: { nom: 'Négoce Durand' },
        dateDEntretien: '2026-10-27',
        hypotheses: { joursTravaillesParAn: 228, heuresAnnuellesTempsPlein: 1_607 },
        processus: [],
      });
      expect(diagnostic.version).toBe(1);
    });

    it('l’enregistre dans le dépôt', () => {
      const { ouvrirUnDiagnostic, depot } = preparer();

      ouvrirUnDiagnostic({ nom: 'Négoce Durand', secteur: 'Négoce', effectifTotal: 25 });

      expect(depot.derniereVersion(id('diagnostic-1'))?.prospect).toMatchObject({
        nom: 'Négoce Durand',
        secteur: 'Négoce',
        effectifTotal: { personnes: 25 },
      });
    });

    it('refuse un prospect invalide sans rien enregistrer', () => {
      const { ouvrirUnDiagnostic, depot } = preparer();

      expect(ouvrirUnDiagnostic({ nom: '  ' })).toMatchObject({
        ok: false,
        error: { kind: 'SaisieInvalide', champ: 'prospect.nom' },
      });
      expect(depot.lister()).toStrictEqual([]);
    });

    it('signale une panne si le générateur rend un identifiant déjà utilisé', () => {
      const toujoursLeMeme: GenerateurDIdentifiants = { nouvelIdentifiant: () => id('doublon') };
      const { ouvrirUnDiagnostic } = preparer(toujoursLeMeme);
      ouvrirUnDiagnostic({ nom: 'Premier' });

      expect(() => ouvrirUnDiagnostic({ nom: 'Second' })).toThrow(
        new Error('Identifiant déjà utilisé à la création : doublon'),
      );
    });
  });

  describe('réviser un diagnostic', () => {
    it('enregistre la version suivante et garde la précédente', () => {
      const { ouvrirUnDiagnostic, reviserUnDiagnostic, depot } = preparer();
      const { id: identifiant, diagnostic } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));

      const v2 = valeur(
        reviserUnDiagnostic(identifiant, 1, {
          ...modifications(diagnostic),
          processus: [uneSaisieDeProcessus()],
        }),
      );

      expect(v2.version).toBe(2);
      expect(v2.processus).toHaveLength(1);
      expect(depot.version(identifiant, 1)?.processus).toStrictEqual([]);
    });

    it('garde la date de l’entretien', () => {
      const { ouvrirUnDiagnostic, reviserUnDiagnostic } = preparer();
      const { id: identifiant, diagnostic } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));

      expect(
        valeur(reviserUnDiagnostic(identifiant, 1, modifications(diagnostic))).dateDEntretien.iso,
      ).toBe('2026-10-27');
    });

    it('refuse de réviser une version qui n’est plus la dernière (révision concurrente)', () => {
      const { ouvrirUnDiagnostic, reviserUnDiagnostic } = preparer();
      const { id: identifiant, diagnostic } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));
      reviserUnDiagnostic(identifiant, 1, modifications(diagnostic));

      expect(reviserUnDiagnostic(identifiant, 1, modifications(diagnostic))).toStrictEqual({
        ok: false,
        error: { kind: 'VersionPerimee', id: identifiant, versionAttendue: 1, versionActuelle: 2 },
      });
    });

    it('refuse aussi quand une autre révision s’enregistre entre la lecture et l’écriture', () => {
      let dejaEcrite = false;
      const depot = new DepotEnCourse((d) => {
        if (dejaEcrite) return;
        dejaEcrite = true;
        const actuelle = d.derniereVersion(identifiant);
        if (actuelle !== undefined) d.enregistrer(identifiant, valeur(actuelle.reviser({})));
      });
      const { ouvrirUnDiagnostic, reviserUnDiagnostic } = creerLesCasDUsage({
        depot,
        horloge: new HorlogeFixe(),
        identifiants: new IdentifiantsSequentiels(),
      });
      const { id: identifiant, diagnostic } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));

      expect(reviserUnDiagnostic(identifiant, 1, modifications(diagnostic))).toStrictEqual({
        ok: false,
        error: { kind: 'VersionPerimee', id: identifiant, versionAttendue: 1, versionActuelle: 2 },
      });
    });

    it('refuse une saisie invalide sans rien enregistrer', () => {
      const { ouvrirUnDiagnostic, reviserUnDiagnostic, depot } = preparer();
      const { id: identifiant, diagnostic } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));

      expect(
        reviserUnDiagnostic(identifiant, 1, {
          ...modifications(diagnostic),
          processus: [uneSaisieDeProcessus({ personnes: 0 })],
        }),
      ).toMatchObject({
        ok: false,
        error: { kind: 'SaisieInvalide', champ: 'processus[0].personnes' },
      });
      expect(depot.derniereVersion(identifiant)?.version).toBe(1);
    });

    it('signale un diagnostic inconnu', () => {
      const { reviserUnDiagnostic, ouvrirUnDiagnostic } = preparer();
      const { diagnostic } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));

      expect(reviserUnDiagnostic(id('inconnu'), 1, modifications(diagnostic))).toStrictEqual({
        ok: false,
        error: { kind: 'DiagnosticIntrouvable', id: 'inconnu' },
      });
    });
  });

  describe('consulter un diagnostic', () => {
    it('rend la dernière version par défaut, ou la version demandée', () => {
      const { ouvrirUnDiagnostic, reviserUnDiagnostic, consulterUnDiagnostic } = preparer();
      const { id: identifiant, diagnostic } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));
      reviserUnDiagnostic(identifiant, 1, modifications(diagnostic));

      expect(valeur(consulterUnDiagnostic(identifiant)).version).toBe(2);
      expect(valeur(consulterUnDiagnostic(identifiant, 1)).version).toBe(1);
    });

    it('signale un diagnostic ou une version inconnus', () => {
      const { ouvrirUnDiagnostic, consulterUnDiagnostic } = preparer();
      const { id: identifiant } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));

      expect(consulterUnDiagnostic(id('inconnu'))).toStrictEqual({
        ok: false,
        error: { kind: 'DiagnosticIntrouvable', id: 'inconnu' },
      });
      expect(consulterUnDiagnostic(identifiant, 5)).toStrictEqual({
        ok: false,
        error: { kind: 'VersionIntrouvable', id: identifiant, version: 5 },
      });
    });
  });

  describe('générer le deck', () => {
    it('construit le deck de la version demandée avec les paramètres donnés', () => {
      const { ouvrirUnDiagnostic, reviserUnDiagnostic, genererLeDeck } = preparer();
      const { id: identifiant, diagnostic } = valeur(ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));
      const v2 = valeur(
        reviserUnDiagnostic(identifiant, 1, {
          ...modifications(diagnostic),
          processus: [uneSaisieDeProcessus()],
        }),
      );
      const parametres = { public: 'technique', duree: 'complete' } as const;

      expect(valeur(genererLeDeck(identifiant, parametres))).toStrictEqual(
        construireDeck(v2, parametres),
      );
      expect(valeur(genererLeDeck(identifiant, parametres, 1))).toStrictEqual(
        construireDeck(diagnostic, parametres),
      );
    });

    it('signale un diagnostic inconnu', () => {
      const { genererLeDeck } = preparer();

      expect(genererLeDeck(id('inconnu'), { public: 'dirigeant', duree: 'courte' })).toStrictEqual({
        ok: false,
        error: { kind: 'DiagnosticIntrouvable', id: 'inconnu' },
      });
    });
  });

  it('liste les diagnostics du dépôt', () => {
    const { ouvrirUnDiagnostic, listerLesDiagnostics } = preparer();
    ouvrirUnDiagnostic({ nom: 'Négoce Durand' });

    expect(listerLesDiagnostics()).toStrictEqual([
      {
        id: 'diagnostic-1',
        prospect: 'Négoce Durand',
        dateDEntretien: '2026-10-27',
        derniereVersion: 1,
      },
    ]);
  });

  describe('exporter et importer', () => {
    /** Un poste où l'on a ouvert un diagnostic puis révisé `revisions` fois. */
    const unPosteAvec = (revisions: number, depot = new DepotEnMemoire()) => {
      const poste = creerLesCasDUsage({
        depot,
        horloge: new HorlogeFixe('2026-10-30'),
        identifiants: new IdentifiantsSequentiels(),
      });
      let { diagnostic } = valeur(poste.ouvrirUnDiagnostic({ nom: 'Négoce Durand' }));
      for (let i = 0; i < revisions; i += 1) {
        diagnostic = valeur(
          poste.reviserUnDiagnostic(id('diagnostic-1'), diagnostic.version, {
            ...modifications(diagnostic),
            processus: [uneSaisieDeProcessus({ personnes: i + 1 })],
          }),
        );
      }
      return { depot, ...poste };
    };

    const exportDe = (revisions: number) =>
      valeur(unPosteAvec(revisions).exporterUnDiagnostic(id('diagnostic-1')));

    it('exporte l’historique complet d’un diagnostic, daté du jour', () => {
      const exporte = exportDe(2);

      expect(exporte).toMatchObject({ exporteLe: '2026-10-30', versionDuFormat: 1 });
      expect(exporte.diagnostics.map((d) => d.versions.map((v) => v.version))).toStrictEqual([
        [1, 2, 3],
      ]);
    });

    it('signale l’export d’un diagnostic inconnu', () => {
      expect(preparer().exporterUnDiagnostic(id('inconnu'))).toStrictEqual({
        ok: false,
        error: { kind: 'DiagnosticIntrouvable', id: 'inconnu' },
      });
    });

    it('exporte tous les diagnostics, dans l’ordre de la liste', () => {
      const { ouvrirUnDiagnostic, exporterLesDiagnostics } = preparer();
      ouvrirUnDiagnostic({ nom: 'Bravo' });
      ouvrirUnDiagnostic({ nom: 'Alpha' });

      expect(
        exporterLesDiagnostics().diagnostics.map((d) =>
          d.versions.map((v) => v.saisie.prospect.nom),
        ),
      ).toStrictEqual([['Alpha'], ['Bravo']]);
    });

    it('importe sur un autre poste un historique relu à l’identique', () => {
      const exporte = exportDe(2);
      const autre = preparer();

      expect(valeur(autre.importerDesDiagnostics(exporte))).toStrictEqual([
        { id: 'diagnostic-1', prospect: 'Négoce Durand', statut: 'importe', versionsAjoutees: 3 },
      ]);
      expect(valeur(autre.exporterUnDiagnostic(id('diagnostic-1'))).diagnostics).toStrictEqual(
        exporte.diagnostics,
      );
    });

    it('ne change rien quand le poste a déjà ces versions, ou plus récentes', () => {
      const poste = unPosteAvec(2);

      for (const exporte of [exportDe(2), exportDe(1)]) {
        expect(valeur(poste.importerDesDiagnostics(exporte))).toMatchObject([
          { statut: 'aJour', versionsAjoutees: 0 },
        ]);
      }
      expect(poste.depot.historique(id('diagnostic-1'))).toHaveLength(3);
    });

    it('complète un historique qui a continué sur l’autre poste', () => {
      const poste = unPosteAvec(1);

      expect(valeur(poste.importerDesDiagnostics(exportDe(3)))).toMatchObject([
        { statut: 'complete', versionsAjoutees: 2 },
      ]);
      expect(valeur(poste.exporterUnDiagnostic(id('diagnostic-1'))).diagnostics).toStrictEqual(
        exportDe(3).diagnostics,
      );
    });

    it('n’écrase jamais un historique qui a divergé', () => {
      const poste = unPosteAvec(1);
      const divergent = poste.reviserUnDiagnostic(id('diagnostic-1'), 2, {
        prospect: { nom: 'Travail local' },
        hypotheses: { joursTravaillesParAn: 228, heuresAnnuellesTempsPlein: 1_607 },
        processus: [],
      });
      valeur(divergent);

      expect(valeur(poste.importerDesDiagnostics(exportDe(3)))).toMatchObject([
        { statut: 'divergent', versionsAjoutees: 0 },
      ]);
      expect(poste.depot.derniereVersion(id('diagnostic-1'))?.prospect.nom).toBe('Travail local');
    });

    it('refuse un fichier invalide sans rien écrire', () => {
      const { importerDesDiagnostics, listerLesDiagnostics } = preparer();
      const exporte = exportDe(0);

      expect(
        importerDesDiagnostics({
          ...exporte,
          diagnostics: [...exporte.diagnostics, { id: 'pas valide', versions: [] }],
        }),
      ).toMatchObject({ ok: false });
      expect(importerDesDiagnostics({ nom: 'x' })).toStrictEqual({
        ok: false,
        error: { kind: 'PasUnExport' },
      });
      expect(listerLesDiagnostics()).toStrictEqual([]);
    });

    it('traite comme divergent un diagnostic créé pendant l’import', () => {
      class DepotDejaRempli extends DepotEnMemoire {
        override importer(identifiant: IdDeDiagnostic) {
          return { ok: false, error: { kind: 'DiagnosticDejaPresent', id: identifiant } } as const;
        }
      }
      const { importerDesDiagnostics } = unPosteAvec(0, new DepotDejaRempli());

      expect(
        valeur(
          importerDesDiagnostics({
            ...exportDe(0),
            diagnostics: [{ ...exportDe(0).diagnostics[0], id: 'autre' }],
          }),
        ),
      ).toMatchObject([{ id: 'autre', statut: 'divergent', versionsAjoutees: 0 }]);
    });

    it('s’arrête quand une révision locale s’intercale, en gardant les versions ajoutées', () => {
      class DepotRevisePendantLImport extends DepotEnMemoire {
        override enregistrer(identifiant: IdDeDiagnostic, diagnostic: Diagnostic) {
          if (diagnostic.version === 3) {
            return {
              ok: false,
              error: { kind: 'VersionDejaEnregistree', id: identifiant, version: 3 },
            } as const;
          }
          return super.enregistrer(identifiant, diagnostic);
        }
      }
      const poste = unPosteAvec(0, new DepotRevisePendantLImport());

      expect(valeur(poste.importerDesDiagnostics(exportDe(3)))).toMatchObject([
        { statut: 'divergent', versionsAjoutees: 1 },
      ]);
      expect(poste.depot.historique(id('diagnostic-1'))).toHaveLength(2);
    });
  });
});
