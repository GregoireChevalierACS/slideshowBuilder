import { DateLocale } from '@slideshow/domain';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { lireUnIdDeDiagnostic } from '../ports.js';
import { lireLaSaisie } from '../saisie/lireLaSaisie.js';
import type { SaisieDeDiagnostic } from '../saisie/SaisieDeDiagnostic.js';
import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '../testing/saisies.js';
import { decrireUnExport, lireUnExport, nomDuFichierDExport } from './exportDeDiagnostics.js';

const le = (iso: string) => {
  const date = DateLocale.depuisIso(iso);
  if (!date.ok) throw new Error(iso);
  return date.value;
};

const unHistorique = (id: string, ...saisies: SaisieDeDiagnostic[]) => {
  const identifiant = lireUnIdDeDiagnostic(id);
  if (!identifiant.ok) throw new Error(id);
  return {
    id: identifiant.value,
    historique: saisies.map((saisie, i) => {
      const lu = lireLaSaisie(saisie, i + 1);
      if (!lu.ok) throw new Error(JSON.stringify(lu.error));
      return lu.value;
    }),
  };
};

const unExport = (diagnostics: readonly unknown[]) => ({
  format: 'slideshow-builder/diagnostics',
  versionDuFormat: 1,
  exporteLe: '2026-10-30',
  diagnostics,
});

const uneVersion = (version: number, saisie: unknown = uneSaisieDeDiagnostic()) => ({
  version,
  saisie,
});

describe('export de diagnostics', () => {
  it('décrit chaque historique, version par version, avec son format et sa date', () => {
    const exporte = decrireUnExport(le('2026-10-30'), [
      unHistorique('a', uneSaisieDeDiagnostic({ processus: [] }), uneSaisieDeDiagnostic()),
    ]);

    expect(exporte).toStrictEqual(
      unExport([
        {
          id: 'a',
          versions: [
            uneVersion(1, uneSaisieDeDiagnostic({ processus: [] })),
            uneVersion(2, uneSaisieDeDiagnostic()),
          ],
        },
      ]),
    );
  });

  it('se relit à l’identique, même passé par du texte JSON', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 3 }), (n, p) => {
        const saisies = Array.from({ length: n }, (_, i) =>
          uneSaisieDeDiagnostic({
            processus: Array.from({ length: p }, (_, j) =>
              uneSaisieDeProcessus({ nom: `Processus ${String(i)}-${String(j)}` }),
            ),
          }),
        );
        const exporte = decrireUnExport(le('2026-10-30'), [unHistorique('a', ...saisies)]);
        const relu = lireUnExport(JSON.parse(JSON.stringify(exporte)));

        expect(relu.ok && decrireUnExport(le('2026-10-30'), relu.value)).toStrictEqual(exporte);
      }),
    );
  });

  describe('refuse un fichier entier', () => {
    it.each([
      ['un tableau', []],
      ['du texte', 'bonjour'],
      ['un autre JSON', { nom: 'x' }],
    ])('qui n’est pas un export : %s', (_, brut) => {
      expect(lireUnExport(brut)).toStrictEqual({ ok: false, error: { kind: 'PasUnExport' } });
    });

    it('exporté par une version plus récente de l’application', () => {
      expect(lireUnExport({ ...unExport([]), versionDuFormat: 2 })).toStrictEqual({
        ok: false,
        error: { kind: 'FormatTropRecent', versionDuFormat: 2 },
      });
    });

    it('d’un format ancien inconnu, comme une structure invalide', () => {
      const lu = lireUnExport({ ...unExport([]), versionDuFormat: 0 });

      expect(lu.ok || lu.error.kind).toBe('StructureDExportInvalide');
    });

    it('dont la structure est invalide, en désignant chaque chemin', () => {
      const lu = lireUnExport(
        unExport([{ id: 'a', versions: [uneVersion(1, { prospect: 'pas un objet' })] }]),
      );

      expect(
        !lu.ok &&
          lu.error.kind === 'StructureDExportInvalide' &&
          lu.error.erreurs.map((e) => e.chemin),
      ).toContain('diagnostics.0.versions.0.saisie.prospect');
    });

    it('dont un identifiant est invalide', () => {
      expect(
        lireUnExport(unExport([{ id: 'pas valide', versions: [uneVersion(1)] }])),
      ).toStrictEqual({ ok: false, error: { kind: 'IdentifiantInvalide', valeur: 'pas valide' } });
    });

    it('qui contient deux fois le même diagnostic', () => {
      const diagnostic = { id: 'a', versions: [uneVersion(1)] };

      expect(lireUnExport(unExport([diagnostic, diagnostic]))).toStrictEqual({
        ok: false,
        error: { kind: 'DiagnosticEnDouble', id: 'a' },
      });
    });

    it.each([
      ['qui ne commence pas à 1', [2, 3], 1],
      ['à qui il manque une version', [1, 3], 2],
      ['dans le désordre', [2, 1], 1],
    ])('dont l’historique est incomplet : %s', (_, numeros, versionAttendue) => {
      expect(
        lireUnExport(unExport([{ id: 'a', versions: numeros.map((n) => uneVersion(n)) }])),
      ).toStrictEqual({
        ok: false,
        error: { kind: 'HistoriqueIncomplet', id: 'a', versionAttendue },
      });
    });

    it('dont une version est refusée par le domaine, en désignant le champ dans le fichier', () => {
      const lu = lireUnExport(
        unExport([
          { id: 'a', versions: [uneVersion(1)] },
          {
            id: 'b',
            versions: [
              uneVersion(1),
              uneVersion(
                2,
                uneSaisieDeDiagnostic({ processus: [uneSaisieDeProcessus({ personnes: 0 })] }),
              ),
            ],
          },
        ]),
      );

      expect(lu.ok || lu.error).toMatchObject({
        kind: 'SaisieInvalide',
        champ: 'diagnostics[1].versions[1].saisie.processus[0].personnes',
      });
    });
  });

  describe('nom du fichier', () => {
    it.each([
      ['Négoce Durand', 'diagnostic-negoce-durand-2026-10-30.json'],
      ['  L’Atelier & Cie !  ', 'diagnostic-l-atelier-cie-2026-10-30.json'],
      ['???', 'diagnostic-sans-nom-2026-10-30.json'],
      [`${'a'.repeat(59)} b`, `diagnostic-${'a'.repeat(59)}-2026-10-30.json`],
    ])('d’un diagnostic : %s', (prospect, nom) => {
      const exporte = decrireUnExport(le('2026-10-30'), [
        unHistorique(
          'a',
          uneSaisieDeDiagnostic(),
          uneSaisieDeDiagnostic({ prospect: { nom: prospect } }),
        ),
      ]);

      expect(nomDuFichierDExport(exporte, 'un-diagnostic')).toBe(nom);
    });

    it('de tous les diagnostics', () => {
      const exporte = decrireUnExport(le('2026-10-30'), [
        unHistorique('a', uneSaisieDeDiagnostic()),
      ]);

      expect(nomDuFichierDExport(exporte, 'tous')).toBe('diagnostics-2026-10-30.json');
    });
  });
});
