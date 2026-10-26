import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { concevoirArchitecture } from '../conception/concevoirArchitecture.js';
import { estimerGains } from '../gains/estimerGains.js';
import { desHypotheses, unProcessus, unProfil, valeurDe } from '../testing/fabriques.js';
import { DateLocale } from './DateLocale.js';
import { Diagnostic, type ProcessusDuDiagnostic } from './Diagnostic.js';
import { Prospect } from './Prospect.js';

const unProspect = (nom = 'Négoce Durand') => valeurDe(Prospect.creer({ nom }));
const leVingtSixOctobre = () => valeurDe(DateLocale.depuisIso('2026-10-26'));
const un = (nom: string, nature: Parameters<typeof unProfil>[0] = {}): ProcessusDuDiagnostic => ({
  processus: unProcessus({ nom }),
  profil: unProfil(nature),
});

const unDiagnostic = (processus: readonly ProcessusDuDiagnostic[] = [un('Relances')]) =>
  valeurDe(
    Diagnostic.creer({
      prospect: unProspect(),
      dateDEntretien: leVingtSixOctobre(),
      hypotheses: desHypotheses(),
      processus,
    }),
  );

describe('Diagnostic', () => {
  it('réunit le prospect, la date de l’entretien, les hypothèses et les processus, en version 1', () => {
    const diagnostic = unDiagnostic();

    expect(diagnostic).toMatchObject({
      version: 1,
      prospect: { nom: 'Négoce Durand' },
      dateDEntretien: { iso: '2026-10-26' },
      hypotheses: { joursTravaillesParAn: 228 },
    });
    expect(diagnostic.processus.map((p) => p.processus.nom)).toStrictEqual(['Relances']);
  });

  it('accepte un diagnostic sans processus (début d’entretien)', () => {
    expect(unDiagnostic([]).processus).toStrictEqual([]);
  });

  it.each([
    ['Relances', 'Relances'],
    ['Relances', ' relances '],
  ])('refuse deux processus nommés « %s » et « %s »', (premier, second) => {
    const resultat = Diagnostic.creer({
      prospect: unProspect(),
      dateDEntretien: leVingtSixOctobre(),
      hypotheses: desHypotheses(),
      processus: [un(premier), un(second)],
    });

    expect(resultat).toStrictEqual({
      ok: false,
      error: { kind: 'NomDeProcessusEnDouble', nom: second.trim() },
    });
  });

  describe('révision', () => {
    it('crée une nouvelle version sans toucher à la précédente', () => {
      const v1 = unDiagnostic();
      const v2 = valeurDe(v1.reviser({ hypotheses: desHypotheses(218) }));

      expect(v2.version).toBe(2);
      expect(v2.hypotheses.joursTravaillesParAn).toBe(218);
      expect(v1.version).toBe(1);
      expect(v1.hypotheses.joursTravaillesParAn).toBe(228);
    });

    it('garde ce qui n’est pas révisé, dont la date de l’entretien', () => {
      const v1 = unDiagnostic();
      const v2 = valeurDe(v1.reviser({ prospect: unProspect('Durand SAS') }));

      expect(v2.prospect.nom).toBe('Durand SAS');
      expect(v2.processus).toBe(v1.processus);
      expect(v2.hypotheses).toBe(v1.hypotheses);
      expect(v2.dateDEntretien).toBe(v1.dateDEntretien);
    });

    it('remplace la liste des processus', () => {
      const v2 = valeurDe(unDiagnostic().reviser({ processus: [un('Devis'), un('Relances')] }));

      expect(v2.processus.map((p) => p.processus.nom)).toStrictEqual(['Devis', 'Relances']);
    });

    it('refuse une révision qui introduit un doublon', () => {
      expect(unDiagnostic().reviser({ processus: [un('Devis'), un('DEVIS')] })).toStrictEqual({
        ok: false,
        error: { kind: 'NomDeProcessusEnDouble', nom: 'DEVIS' },
      });
    });

    it('numérote les versions successives sans trou', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 20 }), (revisions) => {
          let diagnostic = unDiagnostic();
          for (let i = 0; i < revisions; i++) diagnostic = valeurDe(diagnostic.reviser({}));
          return diagnostic.version === revisions + 1;
        }),
      );
    });
  });

  describe('analyse', () => {
    it('estime les gains de ses processus selon ses hypothèses', () => {
      const diagnostic = unDiagnostic([un('Relances'), un('Devis')]);

      expect(diagnostic.estimation).toStrictEqual(
        estimerGains(
          diagnostic.processus.map((p) => p.processus),
          diagnostic.hypotheses,
        ),
      );
    });

    it('conçoit l’architecture de ses processus', () => {
      const diagnostic = unDiagnostic([
        un('Relances', { nature: 'relance' }),
        un('Tri', { nature: 'tri' }),
      ]);

      expect(diagnostic.architecture).toStrictEqual(
        concevoirArchitecture([
          { nom: 'Relances', profil: unProfil({ nature: 'relance' }) },
          { nom: 'Tri', profil: unProfil({ nature: 'tri' }) },
        ]),
      );
    });
  });
});
