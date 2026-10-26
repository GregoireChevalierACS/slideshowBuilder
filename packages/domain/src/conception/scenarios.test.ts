// Scénarios de référence de la conception : des processus types d'une PME de services, avec
// l'architecture qu'un intégrateur proposerait. Critère d'acceptation de la phase 2.

import { describe, expect, it } from 'vitest';
import { unOutil } from '../testing/fabriques.js';
import { concevoirArchitecture, type ProcessusAConcevoir } from './concevoirArchitecture.js';
import { concevoirSolution } from './concevoirSolution.js';
import type { ProfilDAutomatisation } from './ProfilDAutomatisation.js';

const hubspot = () => unOutil('webhook', 'crm', 'HubSpot');
const sellsy = () => unOutil('api', 'facturation', 'Sellsy');
const outlook = () => unOutil('email', 'messagerie', 'Outlook');
const pennylane = () => unOutil('api', 'comptabilite', 'Pennylane');

const devis = (): ProfilDAutomatisation => ({
  nature: 'generation-de-document',
  source: hubspot(),
  cible: sellsy(),
  donnees: 'structurees',
  decisionHumaine: 'ponctuelle',
});

const facturesFournisseurs = (): ProfilDAutomatisation => ({
  nature: 'saisie',
  source: outlook(),
  cible: pennylane(),
  donnees: 'documents',
  decisionHumaine: 'ponctuelle',
});

const triDesMails = (): ProfilDAutomatisation => ({
  nature: 'tri',
  source: outlook(),
  cible: outlook(),
  donnees: 'structurees',
  decisionHumaine: 'aucune',
});

const relancesImpayes = (): ProfilDAutomatisation => ({
  nature: 'relance',
  source: pennylane(),
  cible: outlook(),
  donnees: 'structurees',
  decisionHumaine: 'aucune',
});

const ids = (profil: ProfilDAutomatisation) => concevoirSolution(profil).briques.map((b) => b.id);

describe('Scénarios de conception : PME de services', () => {
  it('devis : dès qu’une affaire est gagnée dans HubSpot, le devis est généré dans Sellsy et validé par le commercial', () => {
    expect(ids(devis())).toStrictEqual([
      'webhook',
      'api',
      'generation-documents',
      'validation-humaine',
      'journal-reprise',
    ]);
    expect(concevoirSolution(devis()).niveau).toBe('assistee');
  });

  it('factures fournisseurs : reçues par e-mail, lues par OCR et IA, saisies dans Pennylane, exceptions validées', () => {
    expect(ids(facturesFournisseurs())).toStrictEqual([
      'reception-email',
      'api',
      'boite-mail',
      'extraction-documents',
      'transformation-donnees',
      'validation-humaine',
      'journal-reprise',
    ]);
    expect(concevoirSolution(facturesFournisseurs()).niveau).toBe('assistee');
  });

  it('mails entrants : classés par IA dès leur arrivée et rangés dans la boîte du bon service', () => {
    expect(ids(triDesMails())).toStrictEqual([
      'reception-email',
      'boite-mail',
      'classification-ia',
      'journal-reprise',
    ]);
    expect(concevoirSolution(triDesMails()).niveau).toBe('complete');
  });

  it('relances : chaque matin, les impayés de Pennylane génèrent les courriers envoyés par Outlook', () => {
    expect(ids(relancesImpayes())).toStrictEqual([
      'planificateur',
      'api',
      'boite-mail',
      'generation-documents',
      'notification',
      'journal-reprise',
    ]);
    expect(concevoirSolution(relancesImpayes()).niveau).toBe('complete');
  });

  it('un ERP maison sans aucun accès impose l’automatisation d’interface et limite le niveau', () => {
    const solution = concevoirSolution({
      nature: 'transfert',
      source: unOutil('aucun', 'facturation', 'ERP maison'),
      cible: pennylane(),
      donnees: 'structurees',
      decisionHumaine: 'aucune',
    });

    expect(solution.briques.map((b) => b.id)).toContain('automatisation-interface');
    expect(solution.niveau).toBe('assistee');
  });

  describe("l'architecture d'ensemble", () => {
    const processus = (): ProcessusAConcevoir[] => [
      { nom: 'Devis', profil: devis() },
      { nom: 'Factures fournisseurs', profil: facturesFournisseurs() },
      { nom: 'Tri des mails', profil: triDesMails() },
      { nom: 'Relances', profil: relancesImpayes() },
    ];

    it('relie les quatre outils du client', () => {
      expect(concevoirArchitecture(processus()).outils.map((o) => o.nom)).toStrictEqual([
        'HubSpot',
        'Sellsy',
        'Outlook',
        'Pennylane',
      ]);
    });

    it('mutualise le connecteur de messagerie entre trois flux et le journal entre tous', () => {
      const { briques } = concevoirArchitecture(processus());
      const utilisateurs = (id: string) => briques.find((b) => b.brique.id === id)?.processus;

      expect(utilisateurs('boite-mail')).toStrictEqual([
        'Factures fournisseurs',
        'Tri des mails',
        'Relances',
      ]);
      expect(utilisateurs('journal-reprise')).toHaveLength(4);
    });

    it("annonce le recours à l'IA (extraction des factures, tri des mails)", () => {
      expect(concevoirArchitecture(processus()).utiliseIA).toBe(true);
    });
  });
});
