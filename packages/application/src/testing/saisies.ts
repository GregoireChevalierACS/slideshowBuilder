// Saisies de test : des fonctions, jamais des données construites au chargement d'un fichier.

import type { SaisieDeDiagnostic, SaisieDeProcessus } from '../saisie/SaisieDeDiagnostic.js';

/** La saisie des factures fournisseurs du scénario de référence du domaine. */
export const uneSaisieDeProcessus = (
  surcharges: Partial<SaisieDeProcessus> = {},
): SaisieDeProcessus => ({
  nom: 'Saisie des factures fournisseurs',
  dureeUnitaireEnSecondes: 240,
  frequence: { nombre: 20, periode: 'jour' },
  personnes: 2,
  tauxBas: 70,
  tauxHaut: 90,
  coutHoraire: { kind: 'Direct', centimesParHeure: 3_500 },
  profil: {
    nature: 'saisie',
    source: { nom: 'Outlook', categorie: 'messagerie', acces: 'email' },
    cible: { nom: 'Pennylane', categorie: 'comptabilite', acces: 'api' },
    donnees: 'documents',
    decisionHumaine: 'ponctuelle',
  },
  ...surcharges,
});

export const uneSaisieDeDiagnostic = (
  surcharges: Partial<SaisieDeDiagnostic> = {},
): SaisieDeDiagnostic => ({
  prospect: { nom: 'Négoce Durand', secteur: 'Négoce de matériaux', effectifTotal: 25 },
  dateDEntretien: '2026-10-27',
  hypotheses: { joursTravaillesParAn: 228, heuresAnnuellesTempsPlein: 1_607 },
  processus: [uneSaisieDeProcessus()],
  ...surcharges,
});
