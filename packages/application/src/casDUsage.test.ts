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
});
