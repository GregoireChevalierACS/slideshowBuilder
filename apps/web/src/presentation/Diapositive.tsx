import {
  brique,
  type CoutHoraire,
  type DiapositiveArchitecture,
  type DiapositiveCoutCache,
  type DiapositiveFeuilleDeRoute,
  type DiapositiveGainsAttendus,
  type DiapositiveHypotheses,
  type DiapositiveObservation,
  type DiapositiveSolutionDUnProcessus,
  type DiapositiveTableauDesProcessus,
  type DiapositiveTitre,
  type HypothesesDeCalcul,
} from '@slideshow/domain';
import type { ReactNode } from 'react';
import { enEtp, enEuros, enEurosAuCentime, enHeures, fourchette } from '../entretien/affichage.js';
import { LIBELLES_DES_CATEGORIES, LIBELLES_DES_NIVEAUX } from '../entretien/libelles.js';
import type { Page } from './pages.js';
import { SchemaDArchitecture } from './SchemaDArchitecture.js';

type Partie = Page['partie'];

/** La dernière page d'une liste répartie (ou la seule) porte le total. */
const estLaDerniere = (partie: Partie) => partie === undefined || partie.numero === partie.total;

const Cadre = ({
  titre,
  partie,
  children,
}: {
  readonly titre: string;
  readonly partie: Partie;
  readonly children: ReactNode;
}) => (
  <>
    <h2 className="titre-de-diapositive">
      {titre}
      {partie !== undefined && (
        <span className="partie">
          {' '}
          · {partie.numero}/{partie.total}
        </span>
      )}
    </h2>
    <div className="contenu-de-diapositive">{children}</div>
  </>
);

const Titre = ({ d }: { readonly d: DiapositiveTitre }) => (
  <div className="diapositive-titre">
    <h1>{d.titre}</h1>
    <p className="prospect">{d.prospect}</p>
    <p className="date">{d.date}</p>
  </div>
);

const Observation = ({
  d,
  partie,
}: {
  readonly d: DiapositiveObservation;
  readonly partie: Partie;
}) => (
  <Cadre titre="Ce que nous avons observé" partie={partie}>
    <p className="contexte">
      {[
        d.secteur,
        d.effectifTotal === undefined ? undefined : `${String(d.effectifTotal)} salariés`,
      ]
        .filter((texte) => texte !== undefined)
        .join(' · ')}
    </p>
    <ul className="etiquettes" aria-label="Outils en place">
      {d.outils.map((outil) => (
        <li key={outil.nom}>
          {outil.nom} <small>{LIBELLES_DES_CATEGORIES[outil.categorie]}</small>
        </li>
      ))}
    </ul>
    <ul className="liste-a-puces" aria-label="Processus relevés">
      {d.processus.map((nom) => (
        <li key={nom}>{nom}</li>
      ))}
    </ul>
  </Cadre>
);

const CoutCache = ({ d }: { readonly d: DiapositiveCoutCache }) => (
  <Cadre titre="Le coût caché" partie={undefined}>
    <p className="chiffre-cle">{enHeures(d.tempsActuelParAn.enSecondes)}</p>
    <p className="sous-titre">par an, aujourd’hui, sur {d.nombreDeProcessus} processus</p>
    <div className="chiffres-secondaires">
      <p>
        <strong>{enEuros(d.valeurActuelleParAn.enCentimes)}</strong> de temps de travail
      </p>
      <p>
        <strong>{enEtp(d.equivalentsTempsPleinActuels)}</strong> occupés
      </p>
    </div>
  </Cadre>
);

const Tableau = ({
  d,
  partie,
}: {
  readonly d: DiapositiveTableauDesProcessus;
  readonly partie: Partie;
}) => (
  <Cadre titre="Processus par processus" partie={partie}>
    <table className="tableau">
      <thead>
        <tr>
          <th scope="col">Processus</th>
          <th scope="col">Aujourd’hui</th>
          <th scope="col">Coût actuel</th>
          <th scope="col">Gain par an</th>
        </tr>
      </thead>
      <tbody>
        {d.lignes.map((ligne) => (
          <tr key={ligne.processus.nom}>
            <th scope="row">{ligne.processus.nom}</th>
            <td>{enHeures(ligne.tempsActuelParAn.enSecondes)}</td>
            <td>{enEuros(ligne.valeurActuelleParAn.enCentimes)}</td>
            <td>
              {fourchette(
                ligne.valeurGagneeParAn.bas.enCentimes,
                ligne.valeurGagneeParAn.haut.enCentimes,
                enEuros,
              )}
            </td>
          </tr>
        ))}
      </tbody>
      {estLaDerniere(partie) && (
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{enHeures(d.total.tempsActuelParAn.enSecondes)}</td>
            <td>{enEuros(d.total.valeurActuelleParAn.enCentimes)}</td>
            <td>
              {fourchette(
                d.total.valeurGagneeParAn.bas.enCentimes,
                d.total.valeurGagneeParAn.haut.enCentimes,
                enEuros,
              )}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  </Cadre>
);

const Architecture = ({ d }: { readonly d: DiapositiveArchitecture }) => (
  <Cadre titre="Architecture cible" partie={undefined}>
    <SchemaDArchitecture diapositive={d} />
    {d.utiliseIA && (
      <p className="legende">
        Les étapes marquées « IA » font appel à l’intelligence artificielle.
      </p>
    )}
  </Cadre>
);

const Solution = ({ d }: { readonly d: DiapositiveSolutionDUnProcessus }) => (
  <Cadre titre={d.processus} partie={undefined}>
    <p className="niveau">
      {LIBELLES_DES_NIVEAUX[d.solution.niveau]} · {d.solution.tauxSuggeres.bas.valeur} à{' '}
      {d.solution.tauxSuggeres.haut.valeur} % du temps gagné
    </p>
    <ul className="justifications">
      {d.solution.justifications.map(({ briques, raison }) => (
        <li key={`${briques.join()}-${raison}`}>
          <strong>{briques.map((id) => brique(id).nom).join(', ')}</strong> — {raison}
        </li>
      ))}
    </ul>
  </Cadre>
);

const Gains = ({
  d,
  partie,
}: {
  readonly d: DiapositiveGainsAttendus;
  readonly partie: Partie;
}) => {
  // Le plus grand gain affiché remplit la piste : les écarts entre processus restent lisibles. Le
  // total, lui, figure en grand au-dessus.
  const maximum = Math.max(1, ...d.parProcessus.map((p) => p.valeurGagneeParAn.haut.enCentimes));
  const pourcent = (centimes: number) => `${String((100 * centimes) / maximum)}%`;
  return (
    <Cadre titre="Gains attendus" partie={partie}>
      <p className="chiffre-cle">
        {fourchette(
          d.total.valeurGagneeParAn.bas.enCentimes,
          d.total.valeurGagneeParAn.haut.enCentimes,
          enEuros,
        )}
      </p>
      <p className="sous-titre">
        par an, soit{' '}
        {fourchette(
          d.total.equivalentsTempsPleinLiberes.bas,
          d.total.equivalentsTempsPleinLiberes.haut,
          enEtp,
        )}{' '}
        libérés
      </p>
      <ul className="barres" aria-label="Gain par processus">
        {d.parProcessus.map(({ processus, valeurGagneeParAn: { bas, haut } }) => (
          <li key={processus}>
            <span className="nom">{processus}</span>
            <span className="piste">
              <span className="barre-basse" style={{ width: pourcent(bas.enCentimes) }} />
              <span
                className="barre-haute"
                style={{
                  left: pourcent(bas.enCentimes),
                  width: pourcent(haut.enCentimes - bas.enCentimes),
                }}
              />
            </span>
            <span className="valeur">{fourchette(bas.enCentimes, haut.enCentimes, enEuros)}</span>
          </li>
        ))}
      </ul>
    </Cadre>
  );
};

const FeuilleDeRoute = ({
  d,
  partie,
}: {
  readonly d: DiapositiveFeuilleDeRoute;
  readonly partie: Partie;
}) => (
  <Cadre titre="Feuille de route" partie={partie}>
    <ol className="chantiers">
      {d.chantiers.map((chantier) => (
        <li key={chantier.nom}>
          <span className="rang">{chantier.rang}</span>
          <span className="nom">{chantier.nom}</span>
          <span className="niveau">{LIBELLES_DES_NIVEAUX[chantier.niveau]}</span>
          <span className="valeur">
            jusqu’à {enEuros(chantier.valeurGagneeParAn.haut.enCentimes)} par an
          </span>
        </li>
      ))}
    </ol>
  </Cadre>
);

/** L'hypothèse telle que saisie, puis le coût d'une heure qui en découle. */
const enTexte = (cout: CoutHoraire, hypotheses: HypothesesDeCalcul): string => {
  const parHeure = `${enEurosAuCentime(cout.centimesParHeure(hypotheses))}/h`;
  if (cout.kind === 'Direct') return parHeure;
  const coefficient = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(
    cout.coefficientDeCharges / 100,
  );
  return `${enEuros(cout.brutAnnuel.enCentimes)} brut × ${coefficient} / ${String(hypotheses.heuresAnnuellesTempsPlein)} h = ${parHeure}`;
};

const Hypotheses = ({
  d,
  partie,
}: {
  readonly d: DiapositiveHypotheses;
  readonly partie: Partie;
}) => (
  <Cadre titre="Hypothèses de calcul" partie={partie}>
    <p className="contexte">
      {d.hypotheses.joursTravaillesParAn} jours travaillés par an ·{' '}
      {d.hypotheses.heuresAnnuellesTempsPlein} h pour un temps plein
    </p>
    <table className="tableau">
      <thead>
        <tr>
          <th scope="col">Processus</th>
          <th scope="col">Coût d’une heure</th>
        </tr>
      </thead>
      <tbody>
        {d.coutsHoraires.map(({ processus, coutHoraire }) => (
          <tr key={processus}>
            <th scope="row">{processus}</th>
            <td>{enTexte(coutHoraire, d.hypotheses)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Cadre>
);

/** Une diapositive sur sa toile 16:9. Le même rendu sert à l'aperçu, au plein écran et au PDF. */
export const DiapositiveAffichee = ({ page }: { readonly page: Page }) => {
  const { diapositive: d, partie } = page;
  const contenu = (() => {
    switch (d.kind) {
      case 'Titre':
        return <Titre d={d} />;
      case 'Observation':
        return <Observation d={d} partie={partie} />;
      case 'CoutCache':
        return <CoutCache d={d} />;
      case 'TableauDesProcessus':
        return <Tableau d={d} partie={partie} />;
      case 'Architecture':
        return <Architecture d={d} />;
      case 'SolutionDUnProcessus':
        return <Solution d={d} />;
      case 'GainsAttendus':
        return <Gains d={d} partie={partie} />;
      case 'FeuilleDeRoute':
        return <FeuilleDeRoute d={d} partie={partie} />;
      case 'Hypotheses':
        return <Hypotheses d={d} partie={partie} />;
    }
  })();
  return (
    <section className={`diapositive diapositive-${d.kind}`} aria-roledescription="diapositive">
      {contenu}
    </section>
  );
};
