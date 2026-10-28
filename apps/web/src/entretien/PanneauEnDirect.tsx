import {
  lireLaSaisie,
  type SaisieDeDiagnostic,
  type SaisieDeProcessus,
} from '@slideshow/application';
import { enEtp, enEuros, enHeures, fourchette, messageDuChamp } from './affichage.js';
import { LIBELLES_DES_NIVEAUX } from './libelles.js';

const PanneauDuProcessus = ({
  saisie,
  processus,
}: {
  readonly saisie: SaisieDeDiagnostic;
  readonly processus: SaisieDeProcessus;
}) => {
  // Le processus seul, avec les hypothèses du diagnostic : ses chiffres ne dépendent pas des autres.
  const seul = lireLaSaisie({ ...saisie, processus: [processus] }, 1);
  if (!seul.ok) {
    return (
      <p className="a-completer">À compléter : {messageDuChamp(seul.error, seul.error.champ)}</p>
    );
  }
  const { estimation, architecture } = seul.value;
  const { total } = estimation;

  return (
    <section aria-label="Ce processus">
      <h3>{processus.nom}</h3>
      <p>
        Aujourd’hui : <strong>{enHeures(total.tempsActuelParAn.enSecondes)}/an</strong>, soit{' '}
        {enEuros(total.valeurActuelleParAn.enCentimes)} et{' '}
        {enEtp(total.equivalentsTempsPleinActuels)}.
      </p>
      <p>
        Gain :{' '}
        <strong>
          {fourchette(
            total.valeurGagneeParAn.bas.enCentimes,
            total.valeurGagneeParAn.haut.enCentimes,
            enEuros,
          )}{' '}
          par an
        </strong>
      </p>
      {/* Un seul processus : une seule solution. */}
      {architecture.solutions.map(({ nom, solution }) => (
        <p key={nom}>Niveau : {LIBELLES_DES_NIVEAUX[solution.niveau]}</p>
      ))}
      <ul className="briques">
        {architecture.briques.map(({ brique }) => (
          <li key={brique.id}>
            {brique.nom}
            {brique.utiliseIA && <span className="ia"> · IA</span>}
          </li>
        ))}
      </ul>
      {estimation.alertes.map((alerte) => (
        <p key={alerte.processus} role="alert">
          ⚠ {alerte.heuresParPersonneParAn} h par personne et par an : plus qu’un temps plein.
          Fréquence saisie pour toute l’équipe ?
        </p>
      ))}
    </section>
  );
};

/**
 * Les chiffres du processus en cours et du diagnostic, recalculés à chaque frappe par le domaine,
 * dans le navigateur : ce sont exactement ceux que la présentation affichera.
 */
export const PanneauEnDirect = ({
  saisie,
  processus,
}: {
  readonly saisie: SaisieDeDiagnostic;
  readonly processus: SaisieDeProcessus | undefined;
}) => {
  const ensemble = lireLaSaisie(saisie, 1);
  return (
    <aside className="panneau-en-direct" aria-label="En direct">
      <h2>En direct</h2>
      {processus !== undefined && <PanneauDuProcessus saisie={saisie} processus={processus} />}
      {ensemble.ok && saisie.processus.length > 0 && (
        <section aria-label="Tout le diagnostic">
          <h3>Total ({saisie.processus.length} processus)</h3>
          <p>
            Gain :{' '}
            {fourchette(
              ensemble.value.estimation.total.valeurGagneeParAn.bas.enCentimes,
              ensemble.value.estimation.total.valeurGagneeParAn.haut.enCentimes,
              enEuros,
            )}{' '}
            par an, soit{' '}
            {fourchette(
              ensemble.value.estimation.total.equivalentsTempsPleinLiberes.bas,
              ensemble.value.estimation.total.equivalentsTempsPleinLiberes.haut,
              enEtp,
            )}
            .
          </p>
        </section>
      )}
    </aside>
  );
};
