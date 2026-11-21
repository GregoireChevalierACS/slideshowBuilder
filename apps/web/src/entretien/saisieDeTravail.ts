import {
  suggererLesTaux,
  type ModeleDeProcessus,
  type ModeleDOption,
  type SaisieDeDiagnostic,
  type SaisieDeFrequence,
  type SaisieDeProcessus,
  type SaisieDOption,
  type SaisieDOutil,
  type SuggestionDeTaux,
} from '@slideshow/application';

// Opérations sur la saisie en cours d'entretien : pures, la saisie n'est jamais modifiée en place.

const outilARenseigner = (): SaisieDOutil => ({ nom: '', categorie: 'autre', acces: 'api' });

/** Un processus tout juste créé : des valeurs plausibles, des outils à renseigner. */
export const processusVierge = (nom: string): SaisieDeProcessus => ({
  nom,
  dureeUnitaireEnSecondes: 300,
  frequence: { nombre: 1, periode: 'jour' },
  personnes: 1,
  tauxBas: 70,
  tauxHaut: 90,
  coutHoraire: { kind: 'Direct', centimesParHeure: 3_500 },
  profil: {
    nature: 'saisie',
    source: outilARenseigner(),
    cible: outilARenseigner(),
    donnees: 'structurees',
    decisionHumaine: 'aucune',
  },
});

const cle = (nom: string) => nom.trim().toLocaleLowerCase('fr');

/** Le nom voulu s'il est libre, sinon « Nom (2) », « Nom (3) »… (le domaine refuse les doublons). */
export const nomLibre = (saisie: SaisieDeDiagnostic, voulu: string): string => {
  const pris = new Set(saisie.processus.map((p) => cle(p.nom)));
  let candidat = voulu;
  for (let numero = 2; pris.has(cle(candidat)); numero++) candidat = `${voulu} (${String(numero)})`;
  return candidat;
};

export const ajouterUnProcessus = (
  saisie: SaisieDeDiagnostic,
  processus: SaisieDeProcessus,
): SaisieDeDiagnostic => ({ ...saisie, processus: [...saisie.processus, processus] });

export const remplacerLeProcessus = (
  saisie: SaisieDeDiagnostic,
  position: number,
  processus: SaisieDeProcessus,
): SaisieDeDiagnostic => ({
  ...saisie,
  processus: saisie.processus.map((p, i) => (i === position ? processus : p)),
});

export const retirerLeProcessus = (
  saisie: SaisieDeDiagnostic,
  position: number,
): SaisieDeDiagnostic => ({
  ...saisie,
  processus: saisie.processus.filter((_, i) => i !== position),
});

/** Les outils déjà cités (une fois chacun, par nom), pour la complétion pendant l'entretien. */
export const outilsCites = (saisie: SaisieDeDiagnostic): SaisieDOutil[] => {
  const vus = new Set<string>();
  return saisie.processus
    .flatMap((p) => [p.profil.source, p.profil.cible])
    .filter((outil) => {
      const nom = cle(outil.nom);
      if (nom === '' || vus.has(nom)) return false;
      vus.add(nom);
      return true;
    });
};

const suggestionDe = (processus: SaisieDeProcessus): SuggestionDeTaux | undefined => {
  const suggestion = suggererLesTaux(processus.profil);
  return suggestion.ok ? suggestion.value : undefined;
};

const avecLesTaux = (processus: SaisieDeProcessus, { tauxBas, tauxHaut }: SuggestionDeTaux) => ({
  ...processus,
  tauxBas,
  tauxHaut,
});

/**
 * Quand le profil change, les taux suivent la nouvelle suggestion de la conception, sauf si
 * l'utilisateur s'était écarté de l'ancienne : un taux ajusté pendant l'entretien n'est jamais écrasé.
 */
export const reconcilierLesTaux = (
  avant: SaisieDeProcessus,
  apres: SaisieDeProcessus,
): SaisieDeProcessus => {
  if (JSON.stringify(avant.profil) === JSON.stringify(apres.profil)) return apres;
  const nouvelle = suggestionDe(apres);
  if (nouvelle === undefined) return apres;
  const ancienne = suggestionDe(avant);
  const suivaitLaSuggestion =
    ancienne === undefined ||
    (avant.tauxBas === ancienne.tauxBas && avant.tauxHaut === ancienne.tauxHaut);
  return suivaitLaSuggestion ? avecLesTaux(apres, nouvelle) : apres;
};

/** Repart d'un modèle en gardant ce que l'entretien a déjà établi : outils, effectif, coût. */
export const appliquerUnModele = (
  saisie: SaisieDeDiagnostic,
  processus: SaisieDeProcessus,
  modele: ModeleDeProcessus,
): SaisieDeProcessus => {
  // Le nom n'est comparé qu'aux autres processus : réappliquer un modèle ne doit pas renommer
  // « Relances » en « Relances (2) » à cause de lui-même.
  const autres = { ...saisie, processus: saisie.processus.filter((p) => p !== processus) };
  const applique: SaisieDeProcessus = {
    ...processus,
    nom: nomLibre(autres, modele.nom),
    dureeUnitaireEnSecondes: modele.dureeUnitaireEnSecondes,
    frequence: modele.frequence,
    profil: {
      ...processus.profil,
      nature: modele.nature,
      donnees: modele.donnees,
      decisionHumaine: modele.decisionHumaine,
    },
  };
  const suggestion = suggestionDe(applique);
  return suggestion === undefined ? applique : avecLesTaux(applique, suggestion);
};

/**
 * Passe une fréquence en saisonnière : la même valeur en saison et hors saison, ce qui ne change
 * aucun chiffre tant qu'on ne l'ajuste pas. Une saison se compte par jour ou par semaine ; une
 * fréquence mensuelle ou annuelle repart par semaine, à ajuster.
 */
export const enFrequenceSaisonniere = (frequence: SaisieDeFrequence): SaisieDeFrequence =>
  'enSaison' in frequence
    ? frequence
    : {
        enSaison: frequence.nombre,
        horsSaison: frequence.nombre,
        periode: frequence.periode === 'jour' ? 'jour' : 'semaine',
      };

/** Revient à une fréquence régulière : celle du reste de l'année, ou de la saison si elle est nulle. */
export const enFrequenceReguliere = (frequence: SaisieDeFrequence): SaisieDeFrequence =>
  'enSaison' in frequence
    ? {
        nombre: frequence.horsSaison === 0 ? frequence.enSaison : frequence.horsSaison,
        periode: frequence.periode,
      }
    : frequence;

const optionsDe = (saisie: SaisieDeDiagnostic) => saisie.options ?? [];

/** Sans option, le champ disparaît de la saisie (comme avant les options). */
export const avecLesOptions = (
  saisie: SaisieDeDiagnostic,
  options: readonly SaisieDOption[],
): SaisieDeDiagnostic => {
  // Champ par champ : un nouveau champ obligatoire de la saisie ne compilerait pas sans être repris.
  const { prospect, dateDEntretien, hypotheses, processus } = saisie;
  const sansOptions = { prospect, dateDEntretien, hypotheses, processus };
  return options.length === 0 ? sansOptions : { ...sansOptions, options };
};

/** Ajoute une option à partir d'un modèle, sous un nom libre (le domaine refuse les doublons). */
export const ajouterUneOption = (
  saisie: SaisieDeDiagnostic,
  modele: ModeleDOption,
): SaisieDeDiagnostic => {
  const options = optionsDe(saisie);
  const pris = new Set(options.map((o) => cle(o.nom)));
  let nom = modele.saisie.nom;
  for (let numero = 2; pris.has(cle(nom)); numero++)
    nom = `${modele.saisie.nom} (${String(numero)})`;
  return avecLesOptions(saisie, [...options, { ...modele.saisie, nom }]);
};

export const remplacerLOption = (
  saisie: SaisieDeDiagnostic,
  position: number,
  option: SaisieDOption,
): SaisieDeDiagnostic =>
  avecLesOptions(
    saisie,
    optionsDe(saisie).map((o, i) => (i === position ? option : o)),
  );

export const retirerLOption = (saisie: SaisieDeDiagnostic, position: number): SaisieDeDiagnostic =>
  avecLesOptions(
    saisie,
    optionsDe(saisie).filter((_, i) => i !== position),
  );

/**
 * Une tâche abandonnée n'est plus faite aujourd'hui : elle sort du coût caché et du gain. Le champ
 * n'apparaît que pour elle.
 */
export const avecAbandon = (
  processus: SaisieDeProcessus,
  abandonne: boolean,
): SaisieDeProcessus => {
  const {
    nom,
    dureeUnitaireEnSecondes,
    frequence,
    personnes,
    tauxBas,
    tauxHaut,
    coutHoraire,
    profil,
  } = processus;
  const fait = {
    nom,
    dureeUnitaireEnSecondes,
    frequence,
    personnes,
    tauxBas,
    tauxHaut,
    coutHoraire,
    profil,
  };
  return abandonne ? { ...fait, abandonne: true } : fait;
};
