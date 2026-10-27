import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '../testing/saisies.js';
import { decrireLeDiagnostic } from './decrireLeDiagnostic.js';
import { lireLaSaisie } from './lireLaSaisie.js';
import type { SaisieDeDiagnostic, SaisieDeProcessus } from './SaisieDeDiagnostic.js';

const lu = (saisie: SaisieDeDiagnostic, version = 1) => {
  const resultat = lireLaSaisie(saisie, version);
  if (!resultat.ok) throw new Error(`saisie de test invalide : ${JSON.stringify(resultat.error)}`);
  return resultat.value;
};

const avecUnProcessus = (surcharges: Partial<SaisieDeProcessus>) =>
  uneSaisieDeDiagnostic({ processus: [uneSaisieDeProcessus(surcharges)] });

describe('lireLaSaisie', () => {
  it('construit le diagnostic du domaine dans la version demandée', () => {
    const diagnostic = lu(uneSaisieDeDiagnostic(), 3);

    expect(diagnostic.version).toBe(3);
    expect(diagnostic.prospect).toMatchObject({
      nom: 'Négoce Durand',
      secteur: 'Négoce de matériaux',
      effectifTotal: { personnes: 25 },
    });
    expect(diagnostic.dateDEntretien.iso).toBe('2026-10-27');
    expect(diagnostic.hypotheses).toMatchObject({
      joursTravaillesParAn: 228,
      heuresAnnuellesTempsPlein: 1_607,
    });
  });

  it('construit chaque processus et son profil', () => {
    const [premier] = lu(uneSaisieDeDiagnostic()).processus;

    expect(premier?.processus).toMatchObject({
      nom: 'Saisie des factures fournisseurs',
      dureeUnitaire: { enSecondes: 240 },
      frequence: { nombre: 20, periode: 'jour' },
      effectif: { personnes: 2 },
      tauxBas: { valeur: 70 },
      tauxHaut: { valeur: 90 },
      coutHoraire: { kind: 'Direct', parHeure: { enCentimes: 3_500 } },
    });
    expect(premier?.profil).toMatchObject({
      nature: 'saisie',
      source: { nom: 'Outlook', categorie: 'messagerie', acces: 'email' },
      cible: { nom: 'Pennylane', categorie: 'comptabilite', acces: 'api' },
      donnees: 'documents',
      decisionHumaine: 'ponctuelle',
    });
  });

  it('lit un coût horaire déduit du salaire', () => {
    const diagnostic = lu(
      avecUnProcessus({
        coutHoraire: {
          kind: 'DepuisSalaireBrutAnnuel',
          brutAnnuelEnCentimes: 4_000_000,
          coefficientDeCharges: 145,
        },
      }),
    );

    expect(diagnostic.processus[0]?.processus.coutHoraire).toMatchObject({
      kind: 'DepuisSalaireBrutAnnuel',
      brutAnnuel: { enCentimes: 4_000_000 },
      coefficientDeCharges: 145,
    });
  });

  it('accepte un prospect sans secteur ni effectif', () => {
    const diagnostic = lu(uneSaisieDeDiagnostic({ prospect: { nom: 'Cabinet Martin' } }));

    expect([diagnostic.prospect.secteur, diagnostic.prospect.effectifTotal]).toStrictEqual([
      undefined,
      undefined,
    ]);
  });

  describe('désigne le champ fautif', () => {
    it.each([
      [{ prospect: { nom: ' ' } }, 'prospect.nom', 'NomDeProspectVide'],
      [
        { prospect: { nom: 'A', effectifTotal: 0 } },
        'prospect.effectifTotal',
        'EffectifInferieurAUn',
      ],
      [{ dateDEntretien: '2026-02-30' }, 'dateDEntretien', 'DateInvalide'],
      [
        { hypotheses: { joursTravaillesParAn: 400, heuresAnnuellesTempsPlein: 1_607 } },
        'hypotheses',
        'JoursTravaillesInvalides',
      ],
    ] as const)('%o → %s', (surcharges, champ, kind) => {
      expect(lireLaSaisie(uneSaisieDeDiagnostic(surcharges), 1)).toMatchObject({
        ok: false,
        error: { kind: 'SaisieInvalide', champ, erreur: { kind } },
      });
    });

    it.each([
      [{ nom: '' }, 'nom', 'NomDeProcessusVide'],
      [{ dureeUnitaireEnSecondes: -1 }, 'dureeUnitaireEnSecondes', 'DureeNegative'],
      [{ frequence: { nombre: 0, periode: 'jour' } }, 'frequence', 'FrequenceInferieureAUn'],
      [{ personnes: 0 }, 'personnes', 'EffectifInferieurAUn'],
      [{ tauxBas: 120 }, 'tauxBas', 'PourcentageHorsBornes'],
      [{ tauxHaut: -5 }, 'tauxHaut', 'PourcentageHorsBornes'],
      [{ tauxBas: 95, tauxHaut: 90 }, 'tauxBas', 'TauxBasSuperieurAuTauxHaut'],
      [{ coutHoraire: { kind: 'Direct', centimesParHeure: -1 } }, 'coutHoraire', 'MontantNegatif'],
      [
        {
          coutHoraire: {
            kind: 'DepuisSalaireBrutAnnuel',
            brutAnnuelEnCentimes: -1,
            coefficientDeCharges: 145,
          },
        },
        'coutHoraire',
        'MontantNegatif',
      ],
      [
        {
          coutHoraire: {
            kind: 'DepuisSalaireBrutAnnuel',
            brutAnnuelEnCentimes: 4_000_000,
            coefficientDeCharges: 50,
          },
        },
        'coutHoraire',
        'CoefficientDeChargesInvalide',
      ],
    ] as const)('processus %o → processus[1].%s', (surcharges, champ, kind) => {
      const saisie = uneSaisieDeDiagnostic({
        processus: [uneSaisieDeProcessus({ nom: 'Premier' }), uneSaisieDeProcessus(surcharges)],
      });

      expect(lireLaSaisie(saisie, 1)).toMatchObject({
        ok: false,
        error: { kind: 'SaisieInvalide', champ: `processus[1].${champ}`, erreur: { kind } },
      });
    });

    it.each(['source', 'cible'] as const)('outil %s sans nom → processus[0].profil.%s', (role) => {
      const profil = uneSaisieDeProcessus().profil;
      const saisie = avecUnProcessus({
        profil: { ...profil, [role]: { nom: '', categorie: 'autre', acces: 'aucun' } },
      });

      expect(lireLaSaisie(saisie, 1)).toMatchObject({
        ok: false,
        error: { champ: `processus[0].profil.${role}`, erreur: { kind: 'NomDOutilVide' } },
      });
    });

    it('signale un doublon au niveau des processus', () => {
      const saisie = uneSaisieDeDiagnostic({
        processus: [
          uneSaisieDeProcessus({ nom: 'Relances' }),
          uneSaisieDeProcessus({ nom: 'relances' }),
        ],
      });

      expect(lireLaSaisie(saisie, 1)).toMatchObject({
        ok: false,
        error: { champ: 'processus', erreur: { kind: 'NomDeProcessusEnDouble', nom: 'relances' } },
      });
    });

    it('signale une version invalide', () => {
      expect(lireLaSaisie(uneSaisieDeDiagnostic(), 0)).toMatchObject({
        ok: false,
        error: { champ: 'version', erreur: { kind: 'VersionInvalide' } },
      });
    });
  });

  describe('aller-retour avec decrireLeDiagnostic', () => {
    it('redonne exactement la saisie de référence', () => {
      expect(decrireLeDiagnostic(lu(uneSaisieDeDiagnostic()))).toStrictEqual(
        uneSaisieDeDiagnostic(),
      );
    });

    it('redonne une saisie sans secteur ni effectif', () => {
      const saisie = uneSaisieDeDiagnostic({ prospect: { nom: 'Cabinet Martin' } });

      expect(decrireLeDiagnostic(lu(saisie))).toStrictEqual(saisie);
    });

    it('redonne exactement toute saisie valide', () => {
      const nom = fc.stringMatching(/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 ]{0,20}[A-Za-zÀ-ÿ0-9]$/);
      const outil = fc.record(
        {
          nom,
          categorie: fc.constantFrom(
            'messagerie',
            'comptabilite',
            'crm',
            'tableur',
            'autre' as const,
          ),
          acces: fc.constantFrom('api', 'webhook', 'email', 'export', 'aucun' as const),
        },
        { noNullPrototype: true },
      );
      const coutHoraire = fc.oneof(
        fc.record(
          { kind: fc.constant('Direct' as const), centimesParHeure: fc.nat(20_000) },
          { noNullPrototype: true },
        ),
        fc.record(
          {
            kind: fc.constant('DepuisSalaireBrutAnnuel' as const),
            brutAnnuelEnCentimes: fc.nat(20_000_000),
            coefficientDeCharges: fc.integer({ min: 100, max: 300 }),
          },
          { noNullPrototype: true },
        ),
      );
      const processus = fc
        .record({
          dureeUnitaireEnSecondes: fc.nat(36_000),
          frequence: fc.record(
            {
              nombre: fc.integer({ min: 1, max: 100 }),
              periode: fc.constantFrom('jour', 'semaine', 'mois', 'an' as const),
            },
            { noNullPrototype: true },
          ),
          personnes: fc.integer({ min: 1, max: 500 }),
          taux: fc.tuple(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 })),
          coutHoraire,
          profil: fc.record(
            {
              nature: fc.constantFrom('saisie', 'tri', 'relance', 'paiement' as const),
              source: outil,
              cible: outil,
              donnees: fc.constantFrom('structurees', 'documents' as const),
              decisionHumaine: fc.constantFrom('aucune', 'ponctuelle', 'systematique' as const),
            },
            { noNullPrototype: true },
          ),
        })
        .map(({ taux, ...reste }) => ({
          ...reste,
          tauxBas: Math.min(...taux),
          tauxHaut: Math.max(...taux),
        }));
      const saisie = fc
        .array(processus, { maxLength: 5 })
        .map((liste) =>
          liste.map((p, i): SaisieDeProcessus => ({ ...p, nom: `Processus ${String(i + 1)}` })),
        )
        .map((liste) => uneSaisieDeDiagnostic({ processus: liste }));

      fc.assert(
        fc.property(saisie, (s) => {
          expect(decrireLeDiagnostic(lu(s))).toStrictEqual(s);
        }),
      );
    });
  });
});
