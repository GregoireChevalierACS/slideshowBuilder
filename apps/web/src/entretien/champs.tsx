import { useId, useState, type ReactNode } from 'react';

/** « 2,5 » comme « 2.5 » ; un texte illisible donne NaN, que le domaine refusera avec un message. */
export const lireUnNombre = (texte: string): number =>
  texte.trim() === '' ? Number.NaN : Number(texte.trim().replace(',', '.'));

const enTexte = (valeur: number): string =>
  Number.isNaN(valeur) ? '' : String(valeur).replace('.', ',');

const Erreur = ({ id, message }: { readonly id: string; readonly message: string | undefined }) =>
  message === undefined ? null : (
    <span id={id} role="alert" className="erreur-de-champ">
      {message}
    </span>
  );

/**
 * Champ numérique qui garde le texte tapé pendant la frappe (« 2, » est une étape, pas une erreur)
 * et ne se resynchronise que si la valeur change d'ailleurs (modèle appliqué, rechargement).
 */
export const ChampNumerique = ({
  libelle,
  valeur,
  modifier,
  erreur,
  unite,
}: {
  readonly libelle: string;
  readonly valeur: number;
  readonly modifier: (valeur: number) => void;
  readonly erreur?: string | undefined;
  readonly unite?: string;
}) => {
  const id = useId();
  const [texte, setTexte] = useState(() => enTexte(valeur));
  const [valeurAffichee, setValeurAffichee] = useState(valeur);
  // La valeur a changé hors de ce champ : on affiche la nouvelle (motif « état dérivé » de React).
  if (!Object.is(valeur, valeurAffichee) && !Object.is(lireUnNombre(texte), valeur)) {
    setValeurAffichee(valeur);
    setTexte(enTexte(valeur));
  }

  return (
    <div className="champ">
      <label htmlFor={`${id}-champ`}>{libelle}</label>
      <span className="saisie-avec-unite">
        <input
          id={`${id}-champ`}
          inputMode="decimal"
          value={texte}
          aria-invalid={erreur !== undefined}
          aria-describedby={erreur === undefined ? undefined : id}
          onChange={(evenement) => {
            setTexte(evenement.target.value);
            const lu = lireUnNombre(evenement.target.value);
            setValeurAffichee(lu);
            modifier(lu);
          }}
        />
        {unite !== undefined && <span className="unite">{unite}</span>}
      </span>
      <Erreur id={id} message={erreur} />
    </div>
  );
};

export const ChampTexte = ({
  libelle,
  valeur,
  modifier,
  erreur,
  suggestions,
}: {
  readonly libelle: string;
  readonly valeur: string;
  readonly modifier: (valeur: string) => void;
  readonly erreur?: string | undefined;
  /** Complétion : par exemple les outils déjà cités pendant l'entretien. */
  readonly suggestions?: readonly string[];
}) => {
  const id = useId();
  return (
    <div className="champ">
      <label htmlFor={`${id}-champ`}>{libelle}</label>
      <input
        id={`${id}-champ`}
        value={valeur}
        list={suggestions === undefined ? undefined : `${id}-suggestions`}
        aria-invalid={erreur !== undefined}
        aria-describedby={erreur === undefined ? undefined : id}
        onChange={(evenement) => {
          modifier(evenement.target.value);
        }}
      />
      {suggestions !== undefined && (
        <datalist id={`${id}-suggestions`}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
      <Erreur id={id} message={erreur} />
    </div>
  );
};

export const ChampDeChoix = <V extends string>({
  libelle,
  valeur,
  modifier,
  choix,
}: {
  readonly libelle: string;
  readonly valeur: V;
  readonly modifier: (valeur: V) => void;
  readonly choix: readonly (readonly [V, string])[];
}) => (
  <label className="champ">
    {libelle}
    <select
      value={valeur}
      onChange={(evenement) => {
        // Le choix correspondant à l'option sélectionnée (il y en a toujours exactement un).
        choix
          .filter(([v]) => v === evenement.target.value)
          .forEach(([v]) => {
            modifier(v);
          });
      }}
    >
      {choix.map(([v, texte]) => (
        <option key={v} value={v}>
          {texte}
        </option>
      ))}
    </select>
  </label>
);

export const Section = ({
  titre,
  children,
}: {
  readonly titre: string;
  readonly children: ReactNode;
}) => (
  <fieldset className="section">
    <legend>{titre}</legend>
    {children}
  </fieldset>
);
