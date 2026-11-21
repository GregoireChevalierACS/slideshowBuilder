import type {
  CoutHoraire,
  Diagnostic,
  Frequence,
  Outil,
  ProcessusDuDiagnostic,
} from '@slideshow/domain';
import type {
  SaisieDeCoutHoraire,
  SaisieDeDiagnostic,
  SaisieDeFrequence,
  SaisieDeProcessus,
  SaisieDOutil,
} from './SaisieDeDiagnostic.js';

const decrireLOutil = ({ nom, categorie, acces }: Outil): SaisieDOutil => ({
  nom,
  categorie,
  acces,
});

const decrireLeCoutHoraire = (cout: CoutHoraire): SaisieDeCoutHoraire =>
  cout.kind === 'Direct'
    ? { kind: 'Direct', centimesParHeure: cout.parHeure.enCentimes }
    : {
        kind: 'DepuisSalaireBrutAnnuel',
        brutAnnuelEnCentimes: cout.brutAnnuel.enCentimes,
        coefficientDeCharges: cout.coefficientDeCharges,
      };

const decrireLaFrequence = ({ repartition }: Frequence): SaisieDeFrequence =>
  repartition.kind === 'Reguliere'
    ? { nombre: repartition.nombre, periode: repartition.periode }
    : {
        enSaison: repartition.enSaison,
        horsSaison: repartition.horsSaison,
        periode: repartition.periode,
      };

const decrireLeProcessus = ({ processus, profil }: ProcessusDuDiagnostic): SaisieDeProcessus => ({
  nom: processus.nom,
  dureeUnitaireEnSecondes: processus.dureeUnitaire.enSecondes,
  frequence: decrireLaFrequence(processus.frequence),
  personnes: processus.effectif.personnes,
  tauxBas: processus.tauxBas.valeur,
  tauxHaut: processus.tauxHaut.valeur,
  coutHoraire: decrireLeCoutHoraire(processus.coutHoraire),
  profil: {
    nature: profil.nature,
    source: decrireLOutil(profil.source),
    cible: decrireLOutil(profil.cible),
    donnees: profil.donnees,
    decisionHumaine: profil.decisionHumaine,
  },
});

/** L'inverse de `lireLaSaisie` : décrire un diagnostic lu redonne exactement sa saisie. */
export const decrireLeDiagnostic = (diagnostic: Diagnostic): SaisieDeDiagnostic => {
  const { nom, secteur, effectifTotal } = diagnostic.prospect;
  return {
    prospect: {
      nom,
      // Les champs absents restent absents : exactOptionalPropertyTypes interdit `secteur: undefined`.
      ...(secteur === undefined ? {} : { secteur }),
      ...(effectifTotal === undefined ? {} : { effectifTotal: effectifTotal.personnes }),
    },
    dateDEntretien: diagnostic.dateDEntretien.iso,
    hypotheses: {
      joursTravaillesParAn: diagnostic.hypotheses.joursTravaillesParAn,
      heuresAnnuellesTempsPlein: diagnostic.hypotheses.heuresAnnuellesTempsPlein,
      // Sans saison, le champ reste absent : les saisies d'avant la saisonnalité sont inchangées.
      ...(diagnostic.hypotheses.semainesDePointe === 0
        ? {}
        : { semainesDePointe: diagnostic.hypotheses.semainesDePointe }),
    },
    processus: diagnostic.processus.map(decrireLeProcessus),
  };
};
