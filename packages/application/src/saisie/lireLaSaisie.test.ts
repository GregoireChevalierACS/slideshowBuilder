import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '../testing/saisies.js';
import { decrireLeDiagnostic } from './decrireLeDiagnostic.js';
import { lireLaSaisie } from './lireLaSaisie.js';
import { MODELES_D_OPTIONS } from '../modeles/modelesDOptions.js';
import type { SaisieDeDiagnostic, SaisieDeProcessus, SaisieDOption } from './SaisieDeDiagnostic.js';

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
      semainesDePointe: 0,
    });
  });

  it('lit une activité saisonnière : semaines de pointe et fréquence en saison', () => {
    const diagnostic = lu(
      uneSaisieDeDiagnostic({
        hypotheses: {
          joursTravaillesParAn: 228,
          heuresAnnuellesTempsPlein: 1_607,
          semainesDePointe: 13,
        },
        processus: [
          uneSaisieDeProcessus({ frequence: { enSaison: 4, horsSaison: 1.5, periode: 'semaine' } }),
        ],
      }),
    );

    expect(diagnostic.hypotheses.semainesDePointe).toBe(13);
    expect(diagnostic.processus[0]?.processus.frequence.repartition).toStrictEqual({
      kind: 'Saisonniere',
      enSaison: 4,
      horsSaison: 1.5,
      periode: 'semaine',
    });
  });

  it('construit chaque processus et son profil', () => {
    const [premier] = lu(uneSaisieDeDiagnostic()).processus;

    expect(premier?.processus).toMatchObject({
      nom: 'Saisie des factures fournisseurs',
      dureeUnitaire: { enSecondes: 240 },
      frequence: { repartition: { kind: 'Reguliere', nombre: 20, periode: 'jour' } },
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
      [{ frequence: { nombre: 0, periode: 'jour' } }, 'frequence', 'FrequenceNulle'],
      [
        { frequence: { enSaison: 2, horsSaison: 1.25, periode: 'semaine' } },
        'frequence',
        'FrequenceTropPrecise',
      ],
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

  describe('options d’hébergement', () => {
    const uneSaisieDOption = (surcharges: Partial<SaisieDOption> = {}): SaisieDOption => ({
      nom: 'Au bureau',
      miseEnPlaceEnCentimes: 200_000,
      materielEnCentimes: 80_000,
      fraisMensuelsBasEnCentimes: 3_000,
      fraisMensuelsHautEnCentimes: 5_000,
      inclus: ['Serveur dans vos locaux'],
      limites: ['Dépend de votre connexion'],
      ...surcharges,
    });
    const avecDesOptions = (...options: SaisieDOption[]) =>
      lireLaSaisie(uneSaisieDeDiagnostic({ options }), 1);

    it('n’en lit aucune quand le champ est absent', () => {
      expect(lu(uneSaisieDeDiagnostic()).options).toStrictEqual([]);
    });

    it('lit chaque option, montants en centimes', () => {
      const lues = avecDesOptions(uneSaisieDOption(), uneSaisieDOption({ nom: 'Dans le cloud' }));

      expect(lues.ok && lues.value.options.map((o) => o.nom)).toStrictEqual([
        'Au bureau',
        'Dans le cloud',
      ]);
      expect(lues.ok && lues.value.options[0]).toMatchObject({
        miseEnPlace: { enCentimes: 200_000 },
        materiel: { enCentimes: 80_000 },
        fraisMensuels: { bas: { enCentimes: 3_000 }, haut: { enCentimes: 5_000 } },
      });
    });

    it.each([
      [{ miseEnPlaceEnCentimes: -1 }, 'miseEnPlaceEnCentimes', 'MontantNegatif'],
      [{ materielEnCentimes: 1.5 }, 'materielEnCentimes', 'MontantNonEntier'],
      [{ fraisMensuelsBasEnCentimes: -1 }, 'fraisMensuelsBasEnCentimes', 'MontantNegatif'],
      [{ fraisMensuelsHautEnCentimes: -1 }, 'fraisMensuelsHautEnCentimes', 'MontantNegatif'],
      [{ nom: ' ' }, 'nom', 'NomDOptionVide'],
      [{ nom: 'n'.repeat(41) }, 'nom', 'NomDOptionTropLong'],
      [
        { fraisMensuelsBasEnCentimes: 6_000 },
        'fraisMensuelsBasEnCentimes',
        'FraisMensuelsBasSuperieursAuxHauts',
      ],
      [{ inclus: [''] }, 'inclus', 'PointVide'],
      [{ limites: ['a'.repeat(41)] }, 'limites', 'PointTropLong'],
      [{ limites: ['1', '2', '3', '4'] }, 'limites', 'TropDePoints'],
    ] as const)('%o → options[1].%s', (surcharges, champ, kind) => {
      expect(
        avecDesOptions(uneSaisieDOption(), uneSaisieDOption({ nom: 'B', ...surcharges })),
      ).toMatchObject({
        ok: false,
        error: { kind: 'SaisieInvalide', champ: `options[1].${champ}`, erreur: { kind } },
      });
    });

    it.each([
      [[uneSaisieDOption({ nom: 'A' }), uneSaisieDOption({ nom: 'a' })], 'NomDOptionEnDouble'],
      [['A', 'B', 'C', 'D'].map((nom) => uneSaisieDOption({ nom })), 'TropDOptions'],
    ] as const)('refuse les options ensemble : %#', (options, kind) => {
      expect(avecDesOptions(...options)).toMatchObject({
        ok: false,
        error: { champ: 'options', erreur: { kind } },
      });
    });

    it('lit chaque modèle d’option tel quel', () => {
      expect(avecDesOptions(...MODELES_D_OPTIONS.map((m) => m.saisie)).ok).toBe(true);
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
          frequence: fc.oneof(
            fc.record(
              {
                // Une décimale au plus : 0,1 à 100.
                nombre: fc.integer({ min: 1, max: 1_000 }).map((n) => n / 10),
                periode: fc.constantFrom('jour', 'semaine', 'mois', 'an' as const),
              },
              { noNullPrototype: true },
            ),
            fc.record(
              {
                enSaison: fc.integer({ min: 1, max: 1_000 }).map((n) => n / 10),
                horsSaison: fc.integer({ min: 0, max: 1_000 }).map((n) => n / 10),
                periode: fc.constantFrom('jour', 'semaine' as const),
              },
              { noNullPrototype: true },
            ),
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
        .chain((liste) =>
          // Sans saison, le champ est absent : un 0 explicite ne se relirait pas à l'identique.
          fc
            .tuple(
              fc.option(fc.integer({ min: 1, max: 45 }), { nil: undefined }),
              fc.array(
                fc.record(
                  {
                    miseEnPlaceEnCentimes: fc.nat(2_000_000),
                    materielEnCentimes: fc.nat(500_000),
                    frais: fc.tuple(fc.nat(100_000), fc.nat(100_000)),
                    inclus: fc.array(fc.constantFrom('Sauvegardes', 'Maintenance'), {
                      maxLength: 3,
                    }),
                    limites: fc.array(fc.constantFrom('Abonnement', 'Connexion'), { maxLength: 3 }),
                  },
                  { noNullPrototype: true },
                ),
                { maxLength: 3 },
              ),
            )
            .map(([semainesDePointe, options]) =>
              uneSaisieDeDiagnostic({
                processus: liste,
                // Sans option, le champ est absent, comme les semaines de pointe.
                ...(options.length === 0
                  ? {}
                  : {
                      options: options.map(({ frais, ...o }, i): SaisieDOption => ({
                        nom: `Option ${String(i + 1)}`,
                        ...o,
                        fraisMensuelsBasEnCentimes: Math.min(...frais),
                        fraisMensuelsHautEnCentimes: Math.max(...frais),
                      })),
                    }),
                hypotheses: {
                  joursTravaillesParAn: 228,
                  heuresAnnuellesTempsPlein: 1_607,
                  ...(semainesDePointe === undefined ? {} : { semainesDePointe }),
                },
              }),
            ),
        );

      fc.assert(
        fc.property(saisie, (s) => {
          expect(decrireLeDiagnostic(lu(s))).toStrictEqual(s);
        }),
      );
    });
  });
});
