import type { SaisieDeDiagnostic, SaisieInvalide } from '@slideshow/application';
import { useRaccourcis } from '../raccourcis/ContexteDesRaccourcis.js';
import { libelle } from '../raccourcis/raccourcis.js';
import { messageDuChamp } from './affichage.js';
import { ChampNumerique, Section } from './champs.js';
import type { EtatDeSauvegarde } from './useEntretien.js';

export type Selection = number | 'hypotheses';

export const ListeDesProcessus = ({
  noms,
  selection,
  choisir,
  ajouter,
}: {
  readonly noms: readonly string[];
  readonly selection: Selection;
  readonly choisir: (selection: Selection) => void;
  readonly ajouter: () => void;
}) => {
  const { raccourcis } = useRaccourcis();
  return (
    <nav className="liste-des-processus" aria-label="Processus">
      <ul>
        {noms.map((nom, position) => (
          <li key={position}>
            <button
              type="button"
              aria-current={selection === position}
              onClick={() => {
                choisir(position);
              }}
            >
              {nom}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={ajouter}>
        + Nouveau processus <kbd>{libelle(raccourcis.nouveauProcessus)}</kbd>
      </button>
      <button
        type="button"
        aria-current={selection === 'hypotheses'}
        onClick={() => {
          choisir('hypotheses');
        }}
      >
        Hypothèses de calcul
      </button>
    </nav>
  );
};

export const FormulaireDesHypotheses = ({
  hypotheses,
  modifier,
  erreur,
}: {
  readonly hypotheses: SaisieDeDiagnostic['hypotheses'];
  readonly modifier: (hypotheses: SaisieDeDiagnostic['hypotheses']) => void;
  readonly erreur: SaisieInvalide | undefined;
}) => (
  <form className="formulaire-des-hypotheses" aria-label="Hypothèses de calcul">
    <Section titre="Hypothèses de calcul">
      <ChampNumerique
        libelle="Jours travaillés par an"
        unite="j"
        valeur={hypotheses.joursTravaillesParAn}
        modifier={(joursTravaillesParAn) => {
          modifier({ ...hypotheses, joursTravaillesParAn });
        }}
      />
      <ChampNumerique
        libelle="Heures annuelles d’un temps plein"
        unite="h"
        valeur={hypotheses.heuresAnnuellesTempsPlein}
        erreur={messageDuChamp(erreur, 'hypotheses')}
        modifier={(heuresAnnuellesTempsPlein) => {
          modifier({ ...hypotheses, heuresAnnuellesTempsPlein });
        }}
      />
      <p className="aide">228 jours et 1 607 h correspondent à un temps plein en France.</p>
    </Section>
  </form>
);

export const IndicateurDeSauvegarde = ({
  sauvegarde,
  recharger,
}: {
  readonly sauvegarde: EtatDeSauvegarde;
  readonly recharger: () => void;
}) => {
  switch (sauvegarde.etat) {
    case 'enregistre':
      return <p role="status">Enregistré · version {sauvegarde.version}</p>;
    case 'en-attente':
    case 'enregistrement':
      return <p role="status">Enregistrement…</p>;
    case 'a-completer':
      return (
        <p role="status">
          Non enregistré : {messageDuChamp(sauvegarde.erreur, sauvegarde.erreur.champ)}
        </p>
      );
    case 'echec':
      return <p role="alert">Non enregistré : {sauvegarde.message}</p>;
    case 'conflit':
      return (
        <div role="alert" className="bandeau-de-conflit">
          Ce diagnostic a été modifié ailleurs
          {sauvegarde.versionActuelle === undefined
            ? ''
            : ` (version ${String(sauvegarde.versionActuelle)})`}
          . Vos dernières modifications ne sont pas enregistrées.{' '}
          <button type="button" onClick={recharger}>
            Recharger la version actuelle
          </button>
        </div>
      );
  }
};
