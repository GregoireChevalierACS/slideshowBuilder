import { concevoirSolution } from '@slideshow/domain';
import { describe, expect, it } from 'vitest';
import { lireLaSaisie } from '../saisie/lireLaSaisie.js';
import type { SaisieDOutil } from '../saisie/SaisieDeDiagnostic.js';
import { uneSaisieDeDiagnostic } from '../testing/saisies.js';
import {
  appliquerLeModele,
  MODELES_DE_PROCESSUS,
  suggererLesTaux,
  type ModeleDeProcessus,
} from './modelesDeProcessus.js';

const outil = (
  nom: string,
  categorie: SaisieDOutil['categorie'],
  acces: SaisieDOutil['acces'] = 'api',
) => ({
  nom,
  categorie,
  acces,
});

const appliquer = (...args: Parameters<typeof appliquerLeModele>) => {
  const applique = appliquerLeModele(...args);
  if (!applique.ok) throw new Error(`modèle inapplicable : ${JSON.stringify(applique.error)}`);
  return applique.value;
};

const modele = (id: string): ModeleDeProcessus => {
  const trouve = MODELES_DE_PROCESSUS.find((m) => m.id === id);
  if (trouve === undefined) throw new Error(`modèle de test absent : ${id}`);
  return trouve;
};

describe('modèles de processus', () => {
  it('proposent les 13 situations les plus fréquentes chez une PME, puis 5 propres aux artisans', () => {
    expect(MODELES_DE_PROCESSUS.map((m) => m.nom)).toStrictEqual([
      'Saisie des factures fournisseurs',
      'Relances des impayés',
      'Devis depuis le CRM',
      'Tri des mails entrants',
      'Rapprochement bancaire',
      'Reporting mensuel',
      'Prise de rendez-vous',
      'Envoi de contrats à signer',
      'Notes de frais',
      'Commandes fournisseurs',
      'Transmission des variables de paie',
      'Mise à jour du CRM après rendez-vous',
      'Relance des devis non signés',
      'Réponses aux questions récurrentes des clients',
      'Fin de chantier : confirmation, facture et demande d’avis',
      'Dossiers de primes à la rénovation (CEE, MaPrimeRénov’)',
      'Planning des intervenants',
      'Mail d’envoi des devis',
    ]);
  });

  it('ont chacun un identifiant unique', () => {
    const ids = MODELES_DE_PROCESSUS.map((m) => m.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(MODELES_DE_PROCESSUS.map((m) => [m.nom, m] as const))(
    '« %s » produit une saisie valide pour le domaine',
    (_nom, m) => {
      const processus = appliquer(m, {
        source: outil('Source', m.categorieSource),
        cible: outil('Cible', m.categorieCible),
        personnes: 2,
        coutHoraire: { kind: 'Direct', centimesParHeure: 3_500 },
      });

      expect(lireLaSaisie(uneSaisieDeDiagnostic({ processus: [processus] }), 1).ok).toBe(true);
    },
  );

  describe('chez un artisan : facturation et messagerie par e-mail, plateforme et agenda sans accès', () => {
    const OUTILS = {
      facturation: outil('Logiciel de facturation', 'facturation', 'email'),
      messagerie: outil('Messagerie', 'messagerie', 'email'),
      autre: outil('Plateforme de primes', 'autre', 'aucun'),
      agenda: outil('Agenda des intervenants', 'agenda', 'aucun'),
    } as const;
    const chezUnArtisan = (m: ModeleDeProcessus) => {
      const pour = (categorie: SaisieDOutil['categorie']) =>
        categorie === 'facturation' || categorie === 'autre' || categorie === 'agenda'
          ? OUTILS[categorie]
          : OUTILS.messagerie;
      return appliquer(m, {
        source: pour(m.categorieSource),
        cible: pour(m.categorieCible),
        personnes: 1,
        coutHoraire: { kind: 'Direct', centimesParHeure: 4_000 },
      });
    };

    it.each([
      // Des réponses types à valider : l'IA reconnaît la question, le gérant relit.
      ['questions-recurrentes', 'assistee', 40, 70],
      // Des envois déclenchés par la date du chantier, sans décision : entièrement automatisable.
      ['fin-de-chantier', 'complete', 70, 90],
      // Une plateforme sans accès : on prépare le dossier, la saisie finale reste humaine.
      ['dossier-de-prime', 'assistee', 40, 70],
      // Chaque affectation est une décision : l'outil propose et prévient, le gérant tranche.
      ['planning-des-intervenants', 'notification', 10, 30],
      // Le mail est rédigé depuis le devis ; le gérant relit avant d'envoyer.
      ['mail-d-envoi-des-devis', 'assistee', 40, 70],
    ] as const)('« %s » : automatisation %s, %i à %i %%', (id, niveau, tauxBas, tauxHaut) => {
      const processus = chezUnArtisan(modele(id));

      expect(suggererLesTaux(processus.profil)).toStrictEqual({
        ok: true,
        value: { niveau, tauxBas, tauxHaut },
      });
      expect(processus).toMatchObject({ tauxBas, tauxHaut });
    });

    it('le mail d’envoi des devis compte environ 300 devis par an (6,5 × 45,6 semaines)', () => {
      expect(modele('mail-d-envoi-des-devis').frequence).toStrictEqual({
        nombre: 6.5,
        periode: 'semaine',
      });
    });
  });

  it('signale un outil sans nom', () => {
    expect(
      appliquerLeModele(modele('tri-mails'), {
        source: outil('', 'messagerie', 'email'),
        cible: outil('Outlook', 'messagerie', 'email'),
        personnes: 1,
        coutHoraire: { kind: 'Direct', centimesParHeure: 3_500 },
      }),
    ).toMatchObject({ ok: false, error: { champ: 'profil.source' } });
  });

  it('reprend le modèle et les choix de l’entretien', () => {
    const processus = appliquer(modele('relances-impayes'), {
      source: outil('Pennylane', 'comptabilite'),
      cible: outil('Outlook', 'messagerie', 'email'),
      personnes: 1,
      coutHoraire: { kind: 'Direct', centimesParHeure: 3_600 },
    });

    expect(processus).toStrictEqual({
      nom: 'Relances des impayés',
      dureeUnitaireEnSecondes: 600,
      frequence: { nombre: 15, periode: 'semaine' },
      personnes: 1,
      tauxBas: 70,
      tauxHaut: 90,
      coutHoraire: { kind: 'Direct', centimesParHeure: 3_600 },
      profil: {
        nature: 'relance',
        source: { nom: 'Pennylane', categorie: 'comptabilite', acces: 'api' },
        cible: { nom: 'Outlook', categorie: 'messagerie', acces: 'email' },
        donnees: 'structurees',
        decisionHumaine: 'aucune',
      },
    });
  });

  describe('suggererLesTaux', () => {
    it('reprend les taux du niveau retenu par la conception', () => {
      const profil = appliquer(modele('saisie-factures-fournisseurs'), {
        source: outil('Outlook', 'messagerie', 'email'),
        cible: outil('Pennylane', 'comptabilite'),
        personnes: 2,
        coutHoraire: { kind: 'Direct', centimesParHeure: 3_500 },
      }).profil;

      expect(suggererLesTaux(profil)).toStrictEqual({
        ok: true,
        value: { niveau: 'assistee', tauxBas: 40, tauxHaut: 70 },
      });
    });

    it.each(MODELES_DE_PROCESSUS.map((m) => [m.nom, m] as const))(
      '« %s » : même niveau que la conception du domaine',
      (_nom, m) => {
        const processus = appliquer(m, {
          source: outil('Source', m.categorieSource),
          cible: outil('Cible', m.categorieCible),
          personnes: 1,
          coutHoraire: { kind: 'Direct', centimesParHeure: 3_500 },
        });
        const lu = lireLaSaisie(uneSaisieDeDiagnostic({ processus: [processus] }), 1);
        const [premier] = lu.ok ? lu.value.processus : [];
        if (premier === undefined) throw new Error('saisie de test invalide');

        expect(suggererLesTaux(processus.profil)).toMatchObject({
          ok: true,
          value: { niveau: concevoirSolution(premier.profil).niveau },
        });
      },
    );

    it.each(['source', 'cible'] as const)('signale un outil %s sans nom', (role) => {
      const profil = {
        nature: 'tri',
        source: outil('Outlook', 'messagerie', 'email'),
        cible: outil('Outlook', 'messagerie', 'email'),
        donnees: 'structurees',
        decisionHumaine: 'aucune',
        [role]: outil(' ', 'autre'),
      } as const;

      expect(suggererLesTaux(profil)).toStrictEqual({
        ok: false,
        error: {
          kind: 'SaisieInvalide',
          champ: `profil.${role}`,
          erreur: { kind: 'NomDOutilVide' },
        },
      });
    });
  });
});
