import {
  lireLaSaisie,
  MODELES_D_OPTIONS,
  type SaisieDeDiagnostic,
  type SaisieDOption,
  type SaisieInvalide,
} from '@slideshow/application';
import { OPTIONS_PAR_DIAGNOSTIC, type CoutDUneOption } from '@slideshow/domain';
import { enCoutParHeure, enEuros, fourchette, messageDuChamp } from './affichage.js';
import { ChampDeListe, ChampNumerique, ChampTexte, Section } from './champs.js';
import { ajouterUneOption, remplacerLOption, retirerLOption } from './saisieDeTravail.js';

const enCentimes = (euros: number) => Math.round(euros * 100);

/** Ce que coûte l'option, recalculé à chaque frappe par le domaine. */
const Chiffrage = ({ cout }: { readonly cout: CoutDUneOption }) => (
  <p className="chiffrage">
    Sur 3 ans :{' '}
    {fourchette(cout.coutSurTroisAns.bas.enCentimes, cout.coutSurTroisAns.haut.enCentimes, enEuros)}{' '}
    · par heure récupérée : {enCoutParHeure(cout.coutParHeureRecuperee)}
  </p>
);

const FormulaireDUneOption = ({
  option,
  position,
  cout,
  erreur,
  modifier,
  retirer,
}: {
  readonly option: SaisieDOption;
  readonly position: number;
  readonly cout: CoutDUneOption | undefined;
  readonly erreur: SaisieInvalide | undefined;
  readonly modifier: (option: SaisieDOption) => void;
  readonly retirer: () => void;
}) => {
  const champ = (nom: keyof SaisieDOption) =>
    messageDuChamp(erreur, `options[${String(position)}].${nom}`);
  const montant = (
    libelle: string,
    nom:
      | 'miseEnPlaceEnCentimes'
      | 'materielEnCentimes'
      | 'fraisMensuelsBasEnCentimes'
      | 'fraisMensuelsHautEnCentimes',
    unite: string,
  ) => (
    <ChampNumerique
      libelle={libelle}
      unite={unite}
      valeur={option[nom] / 100}
      erreur={champ(nom)}
      modifier={(euros) => {
        modifier({ ...option, [nom]: enCentimes(euros) });
      }}
    />
  );

  return (
    <Section titre={option.nom.trim() === '' ? `Option ${String(position + 1)}` : option.nom}>
      <ChampTexte
        libelle="Nom de l’option"
        valeur={option.nom}
        erreur={champ('nom')}
        modifier={(nom) => {
          modifier({ ...option, nom });
        }}
      />
      {montant('Mise en place', 'miseEnPlaceEnCentimes', '€')}
      {montant('Matériel', 'materielEnCentimes', '€')}
      {montant('Frais mensuels bas', 'fraisMensuelsBasEnCentimes', '€/mois')}
      {montant('Frais mensuels hauts', 'fraisMensuelsHautEnCentimes', '€/mois')}
      <ChampDeListe
        libelle="Ce qui est inclus (un point par ligne)"
        valeur={option.inclus}
        erreur={champ('inclus')}
        modifier={(inclus) => {
          modifier({ ...option, inclus });
        }}
      />
      <ChampDeListe
        libelle="Limites (un point par ligne)"
        valeur={option.limites}
        erreur={champ('limites')}
        modifier={(limites) => {
          modifier({ ...option, limites });
        }}
      />
      {cout !== undefined && <Chiffrage cout={cout} />}
      <button type="button" onClick={retirer}>
        Retirer cette option
      </button>
    </Section>
  );
};

/** Les façons d'héberger la solution, comparées sur une diapositive après les gains. */
export const FormulaireDesOptions = ({
  saisie,
  modifier,
  erreur,
}: {
  readonly saisie: SaisieDeDiagnostic;
  readonly modifier: (saisie: SaisieDeDiagnostic) => void;
  readonly erreur: SaisieInvalide | undefined;
}) => {
  const options = saisie.options ?? [];
  // Le chiffrage vient du domaine ; tant qu'une valeur est refusée, il n'est pas affiché.
  const lu = lireLaSaisie(saisie, 1);
  const couts = lu.ok ? lu.value.coutDesOptions : [];

  return (
    <form className="formulaire-des-options" aria-label="Options d’hébergement">
      <h2>Options d’hébergement</h2>
      <p className="aide">
        Comparées sur une diapositive après les gains, en coût sur 3 ans et en coût par heure
        récupérée. Les montants des modèles sont à 0 : saisissez vos tarifs.
      </p>
      {messageDuChamp(erreur, 'options') !== undefined && (
        <p role="alert">{messageDuChamp(erreur, 'options')}</p>
      )}
      {options.map((option, position) => (
        <FormulaireDUneOption
          // Une option retirée décale les suivantes : le formulaire suit sa position.
          key={position}
          option={option}
          position={position}
          cout={couts[position]}
          erreur={erreur}
          modifier={(modifiee) => {
            modifier(remplacerLOption(saisie, position, modifiee));
          }}
          retirer={() => {
            modifier(retirerLOption(saisie, position));
          }}
        />
      ))}
      {options.length < OPTIONS_PAR_DIAGNOSTIC && (
        <label className="champ">
          Ajouter une option
          <select
            value=""
            onChange={(evenement) => {
              MODELES_D_OPTIONS.filter((m) => m.id === evenement.target.value).forEach((m) => {
                modifier(ajouterUneOption(saisie, m));
              });
            }}
          >
            <option value="">— Choisir un modèle —</option>
            {MODELES_D_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.saisie.nom}
              </option>
            ))}
          </select>
        </label>
      )}
    </form>
  );
};
