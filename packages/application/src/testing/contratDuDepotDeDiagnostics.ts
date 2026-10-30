// Contrat du port DepotDeDiagnostics, joué contre chaque adapter (Fake en mémoire, SQLite).
// Un mock vérifierait des appels ; ce contrat vérifie un comportement, le même partout.

import { describe, expect, it } from 'vitest';
import type { DepotDeDiagnostics, IdDeDiagnostic } from '../ports.js';
import { lireUnIdDeDiagnostic } from '../ports.js';
import { decrireLeDiagnostic } from '../saisie/decrireLeDiagnostic.js';
import { lireLaSaisie } from '../saisie/lireLaSaisie.js';
import type { SaisieDeDiagnostic } from '../saisie/SaisieDeDiagnostic.js';
import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from './saisies.js';

const id = (texte: string): IdDeDiagnostic => {
  const lu = lireUnIdDeDiagnostic(texte);
  if (!lu.ok) throw new Error(`identifiant de test invalide : ${texte}`);
  return lu.value;
};

const diagnostic = (version: number, surcharges: Partial<SaisieDeDiagnostic> = {}) => {
  const lu = lireLaSaisie(uneSaisieDeDiagnostic(surcharges), version);
  if (!lu.ok) throw new Error(`diagnostic de test invalide : ${JSON.stringify(lu.error)}`);
  return lu.value;
};

export const verifierLeContratDuDepotDeDiagnostics = (
  nom: string,
  fabriquerUnDepotVide: () => DepotDeDiagnostics,
): void => {
  describe(`contrat du dépôt de diagnostics : ${nom}`, () => {
    it('retrouve la dernière version enregistrée, à l’identique', () => {
      const depot = fabriquerUnDepotVide();
      const v1 = diagnostic(1);

      expect(depot.enregistrer(id('a'), v1)).toStrictEqual({ ok: true, value: undefined });
      expect(decrireLeDiagnostic(depot.derniereVersion(id('a')) ?? diagnostic(99))).toStrictEqual(
        decrireLeDiagnostic(v1),
      );
      expect(depot.derniereVersion(id('a'))?.version).toBe(1);
    });

    it('ne connaît pas un diagnostic jamais enregistré', () => {
      const depot = fabriquerUnDepotVide();

      expect(depot.derniereVersion(id('inconnu'))).toBeUndefined();
      expect(depot.version(id('inconnu'), 1)).toBeUndefined();
    });

    it('garde toutes les versions : la plus récente par défaut, chacune sur demande', () => {
      const depot = fabriquerUnDepotVide();
      depot.enregistrer(id('a'), diagnostic(1, { prospect: { nom: 'Version un' } }));
      depot.enregistrer(id('a'), diagnostic(2, { prospect: { nom: 'Version deux' } }));

      expect(depot.derniereVersion(id('a'))?.prospect.nom).toBe('Version deux');
      expect(depot.version(id('a'), 1)?.prospect.nom).toBe('Version un');
      expect(depot.version(id('a'), 2)?.version).toBe(2);
      expect(depot.version(id('a'), 3)).toBeUndefined();
    });

    it('refuse d’écraser une version déjà enregistrée', () => {
      const depot = fabriquerUnDepotVide();
      depot.enregistrer(id('a'), diagnostic(1, { prospect: { nom: 'Original' } }));

      expect(
        depot.enregistrer(id('a'), diagnostic(1, { prospect: { nom: 'Concurrent' } })),
      ).toStrictEqual({
        ok: false,
        error: { kind: 'VersionDejaEnregistree', id: 'a', version: 1 },
      });
      expect(depot.derniereVersion(id('a'))?.prospect.nom).toBe('Original');
    });

    it('sépare les diagnostics de prospects différents', () => {
      const depot = fabriquerUnDepotVide();
      depot.enregistrer(id('a'), diagnostic(1, { prospect: { nom: 'A' } }));
      depot.enregistrer(id('b'), diagnostic(1, { prospect: { nom: 'B' } }));

      expect(depot.derniereVersion(id('a'))?.prospect.nom).toBe('A');
      expect(depot.derniereVersion(id('b'))?.prospect.nom).toBe('B');
    });

    it('conserve les processus et leurs profils', () => {
      const depot = fabriquerUnDepotVide();
      const complet = diagnostic(1, {
        processus: [
          uneSaisieDeProcessus({ nom: 'Saisie' }),
          uneSaisieDeProcessus({
            nom: 'Relances',
            coutHoraire: {
              kind: 'DepuisSalaireBrutAnnuel',
              brutAnnuelEnCentimes: 4_000_000,
              coefficientDeCharges: 145,
            },
          }),
        ],
      });
      depot.enregistrer(id('a'), complet);

      expect(decrireLeDiagnostic(depot.derniereVersion(id('a')) ?? diagnostic(99))).toStrictEqual(
        decrireLeDiagnostic(complet),
      );
    });

    it('liste les diagnostics, les entretiens les plus récents d’abord, avec leur dernière version', () => {
      const depot = fabriquerUnDepotVide();
      depot.enregistrer(
        id('ancien'),
        diagnostic(1, { prospect: { nom: 'Ancien' }, dateDEntretien: '2026-09-01' }),
      );
      depot.enregistrer(
        id('recent-b'),
        diagnostic(1, { prospect: { nom: 'Bravo' }, dateDEntretien: '2026-10-27' }),
      );
      depot.enregistrer(
        id('recent-a'),
        diagnostic(1, { prospect: { nom: 'Alpha' }, dateDEntretien: '2026-10-27' }),
      );
      depot.enregistrer(
        id('recent-a'),
        diagnostic(2, { prospect: { nom: 'Alpha' }, dateDEntretien: '2026-10-27' }),
      );

      expect(depot.lister()).toStrictEqual([
        { id: 'recent-a', prospect: 'Alpha', dateDEntretien: '2026-10-27', derniereVersion: 2 },
        { id: 'recent-b', prospect: 'Bravo', dateDEntretien: '2026-10-27', derniereVersion: 1 },
        { id: 'ancien', prospect: 'Ancien', dateDEntretien: '2026-09-01', derniereVersion: 1 },
      ]);
    });

    it('liste le nom du prospect de la dernière version', () => {
      const depot = fabriquerUnDepotVide();
      depot.enregistrer(id('a'), diagnostic(1, { prospect: { nom: 'Ancien nom' } }));
      depot.enregistrer(id('a'), diagnostic(2, { prospect: { nom: 'Nouveau nom' } }));

      expect(depot.lister().map((r) => r.prospect)).toStrictEqual(['Nouveau nom']);
    });

    it('ne liste rien quand il est vide', () => {
      expect(fabriquerUnDepotVide().lister()).toStrictEqual([]);
    });

    it('rend l’historique complet, de la plus ancienne version à la plus récente', () => {
      const depot = fabriquerUnDepotVide();
      depot.enregistrer(id('a'), diagnostic(2, { prospect: { nom: 'Deux' } }));
      depot.enregistrer(id('a'), diagnostic(1, { prospect: { nom: 'Un' } }));
      depot.enregistrer(id('b'), diagnostic(1, { prospect: { nom: 'Autre' } }));

      expect(depot.historique(id('a')).map((d) => [d.version, d.prospect.nom])).toStrictEqual([
        [1, 'Un'],
        [2, 'Deux'],
      ]);
      expect(depot.historique(id('inconnu'))).toStrictEqual([]);
    });

    it('importe un historique complet, relu à l’identique', () => {
      const depot = fabriquerUnDepotVide();
      const historique = [
        diagnostic(1, { prospect: { nom: 'Un' } }),
        diagnostic(2, { processus: [uneSaisieDeProcessus()] }),
      ];

      expect(depot.importer(id('a'), historique)).toStrictEqual({ ok: true, value: undefined });
      expect(depot.historique(id('a')).map(decrireLeDiagnostic)).toStrictEqual(
        historique.map(decrireLeDiagnostic),
      );
      expect(depot.lister().map((r) => r.derniereVersion)).toStrictEqual([2]);
    });

    it('refuse d’importer un diagnostic déjà présent, sans rien y changer', () => {
      const depot = fabriquerUnDepotVide();
      depot.enregistrer(id('a'), diagnostic(1, { prospect: { nom: 'Original' } }));

      expect(
        depot.importer(id('a'), [diagnostic(2, { prospect: { nom: 'Importé' } })]),
      ).toStrictEqual({ ok: false, error: { kind: 'DiagnosticDejaPresent', id: 'a' } });
      expect(depot.historique(id('a')).map((d) => d.prospect.nom)).toStrictEqual(['Original']);
    });
  });
};
