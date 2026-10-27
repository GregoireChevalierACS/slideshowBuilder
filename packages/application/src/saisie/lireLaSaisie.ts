import {
  CoutHoraire,
  DateLocale,
  Diagnostic,
  Duree,
  Effectif,
  err,
  Frequence,
  HypothesesDeCalcul,
  Montant,
  ok,
  Outil,
  Pourcentage,
  ProcessusRedondant,
  Prospect,
  type CoefficientDeChargesInvalide,
  type DateInvalide,
  type DiagnosticInvalide,
  type DureeInvalide,
  type EffectifInvalide,
  type FrequenceInvalide,
  type HypothesesInvalides,
  type MontantInvalide,
  type OutilInvalide,
  type PourcentageInvalide,
  type ProcessusDuDiagnostic,
  type ProcessusInvalide,
  type ProspectInvalide,
  type Result,
} from '@slideshow/domain';
import type {
  SaisieDeCoutHoraire,
  SaisieDeDiagnostic,
  SaisieDeProcessus,
  SaisieDOutil,
} from './SaisieDeDiagnostic.js';

export type ErreurDuDomaine =
  | CoefficientDeChargesInvalide
  | DateInvalide
  | DiagnosticInvalide
  | DureeInvalide
  | EffectifInvalide
  | FrequenceInvalide
  | HypothesesInvalides
  | MontantInvalide
  | OutilInvalide
  | PourcentageInvalide
  | ProcessusInvalide
  | ProspectInvalide;

/** Une règle métier refuse une valeur saisie : le champ est désigné pour l'interface. */
export interface SaisieInvalide {
  readonly kind: 'SaisieInvalide';
  /** Chemin du champ dans la saisie, par exemple « processus[1].tauxBas ». */
  readonly champ: string;
  readonly erreur: ErreurDuDomaine;
}

type Lecture<T> = Result<T, SaisieInvalide>;

/** Rattache l'erreur du domaine au champ saisi. */
const au = <T>(champ: string, resultat: Result<T, ErreurDuDomaine>): Lecture<T> =>
  resultat.ok ? resultat : err({ kind: 'SaisieInvalide', champ, erreur: resultat.error });

const lireLOutil = (saisie: SaisieDOutil, champ: string): Lecture<Outil> =>
  au(champ, Outil.creer(saisie));

const lireLeCoutHoraire = (saisie: SaisieDeCoutHoraire): Result<CoutHoraire, ErreurDuDomaine> => {
  if (saisie.kind === 'Direct') {
    const parHeure = Montant.depuisCentimes(saisie.centimesParHeure);
    return parHeure.ok ? ok(CoutHoraire.direct(parHeure.value)) : parHeure;
  }
  const brutAnnuel = Montant.depuisCentimes(saisie.brutAnnuelEnCentimes);
  if (!brutAnnuel.ok) return brutAnnuel;
  return CoutHoraire.depuisSalaireBrutAnnuel(brutAnnuel.value, saisie.coefficientDeCharges);
};

const lireLeProcessus = (
  saisie: SaisieDeProcessus,
  position: number,
): Lecture<ProcessusDuDiagnostic> => {
  const champ = (nom: string) => `processus[${String(position)}].${nom}`;

  const dureeUnitaire = au(
    champ('dureeUnitaireEnSecondes'),
    Duree.depuisSecondes(saisie.dureeUnitaireEnSecondes),
  );
  if (!dureeUnitaire.ok) return dureeUnitaire;
  const frequence = au(
    champ('frequence'),
    Frequence.creer(saisie.frequence.nombre, saisie.frequence.periode),
  );
  if (!frequence.ok) return frequence;
  const effectif = au(champ('personnes'), Effectif.creer(saisie.personnes));
  if (!effectif.ok) return effectif;
  const tauxBas = au(champ('tauxBas'), Pourcentage.creer(saisie.tauxBas));
  if (!tauxBas.ok) return tauxBas;
  const tauxHaut = au(champ('tauxHaut'), Pourcentage.creer(saisie.tauxHaut));
  if (!tauxHaut.ok) return tauxHaut;
  const coutHoraire = au(champ('coutHoraire'), lireLeCoutHoraire(saisie.coutHoraire));
  if (!coutHoraire.ok) return coutHoraire;

  const processus = ProcessusRedondant.creer({
    nom: saisie.nom,
    dureeUnitaire: dureeUnitaire.value,
    frequence: frequence.value,
    effectif: effectif.value,
    tauxBas: tauxBas.value,
    tauxHaut: tauxHaut.value,
    coutHoraire: coutHoraire.value,
  });
  if (!processus.ok) {
    const fautif = processus.error.kind === 'NomDeProcessusVide' ? 'nom' : 'tauxBas';
    return au(champ(fautif), processus);
  }

  const source = lireLOutil(saisie.profil.source, champ('profil.source'));
  if (!source.ok) return source;
  const cible = lireLOutil(saisie.profil.cible, champ('profil.cible'));
  if (!cible.ok) return cible;

  return ok({
    processus: processus.value,
    profil: { ...saisie.profil, source: source.value, cible: cible.value },
  });
};

const lireLesProcessus = (
  saisies: readonly SaisieDeProcessus[],
): Lecture<ProcessusDuDiagnostic[]> => {
  const lus: ProcessusDuDiagnostic[] = [];
  for (const [position, saisie] of saisies.entries()) {
    const processus = lireLeProcessus(saisie, position);
    if (!processus.ok) return processus;
    lus.push(processus.value);
  }
  return ok(lus);
};

const lireLeProspect = (saisie: SaisieDeDiagnostic['prospect']): Lecture<Prospect> => {
  const { nom, secteur, effectifTotal } = saisie;
  const identite = secteur === undefined ? { nom } : { nom, secteur };
  if (effectifTotal === undefined) return au('prospect.nom', Prospect.creer(identite));
  const effectif = au('prospect.effectifTotal', Effectif.creer(effectifTotal));
  if (!effectif.ok) return effectif;
  return au('prospect.nom', Prospect.creer({ ...identite, effectifTotal: effectif.value }));
};

/**
 * Construit le diagnostic du domaine à partir d'une saisie dont la structure est déjà validée.
 * Les règles métier sont celles du domaine ; la première valeur refusée est signalée avec son champ.
 */
export const lireLaSaisie = (saisie: SaisieDeDiagnostic, version: number): Lecture<Diagnostic> => {
  const prospect = lireLeProspect(saisie.prospect);
  if (!prospect.ok) return prospect;
  const dateDEntretien = au('dateDEntretien', DateLocale.depuisIso(saisie.dateDEntretien));
  if (!dateDEntretien.ok) return dateDEntretien;
  const hypotheses = au('hypotheses', HypothesesDeCalcul.creer(saisie.hypotheses));
  if (!hypotheses.ok) return hypotheses;
  const processus = lireLesProcessus(saisie.processus);
  if (!processus.ok) return processus;

  const diagnostic = Diagnostic.restaurer(
    {
      prospect: prospect.value,
      dateDEntretien: dateDEntretien.value,
      hypotheses: hypotheses.value,
      processus: processus.value,
    },
    version,
  );
  if (diagnostic.ok) return diagnostic;
  return au(diagnostic.error.kind === 'VersionInvalide' ? 'version' : 'processus', diagnostic);
};
