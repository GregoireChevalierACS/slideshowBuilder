import { lireLaSaisie, type SaisieDeDiagnostic, type SaisieInvalide } from '@slideshow/application';
import { construireDeck } from '@slideshow/domain';
import { DiapositiveAffichee } from '../presentation/Diapositive.js';
import { pagesDuDeck } from '../presentation/pages.js';
import { messageDuChamp } from './affichage.js';
import { Section } from './champs.js';
import { avecLeTheme } from './saisieDeTravail.js';

const COULEUR_PAR_DEFAUT = '#1f5fbf';

/** Le fichier en URL de données ; le domaine en vérifie ensuite le format et la taille. */
const enUrlDeDonnees = async (fichier: File): Promise<string> => {
  const octets = new Uint8Array(await fichier.arrayBuffer());
  let binaire = '';
  for (const octet of octets) binaire += String.fromCharCode(octet);
  return `data:${fichier.type};base64,${btoa(binaire)}`;
};

/** La couleur et le logo du prospect, avec un aperçu de la page de titre. */
export const FormulaireDuTheme = ({
  saisie,
  modifier,
  erreur,
}: {
  readonly saisie: SaisieDeDiagnostic;
  readonly modifier: (saisie: SaisieDeDiagnostic) => void;
  readonly erreur: SaisieInvalide | undefined;
}) => {
  const theme = saisie.theme ?? {};
  const changer = (changement: NonNullable<SaisieDeDiagnostic['theme']>) => {
    modifier(avecLeTheme(saisie, changement));
  };
  const sansCouleur = { ...(theme.logo === undefined ? {} : { logo: theme.logo }) };
  const sansLogo = { ...(theme.couleur === undefined ? {} : { couleur: theme.couleur }) };
  const lu = lireLaSaisie(saisie, 1);
  const titre = lu.ok
    ? pagesDuDeck(construireDeck(lu.value, { public: 'dirigeant', duree: 'courte' }))[0]
    : undefined;
  // La couleur réellement affichée, si le domaine a dû l'assombrir pour qu'elle reste lisible.
  const couleurLue = lu.ok ? lu.value.theme.couleur : undefined;
  const affichee = couleurLue?.lisibleSurBlanc().hex;
  const lisible = affichee === couleurLue?.hex ? undefined : affichee;
  const erreurDeLogo = messageDuChamp(erreur, 'theme.logo');

  return (
    <form className="formulaire-du-theme" aria-label="Thème de la présentation">
      <Section titre="Thème de la présentation">
        <div className="champ">
          <label htmlFor="couleur-du-prospect">Couleur principale</label>
          <input
            id="couleur-du-prospect"
            type="color"
            value={theme.couleur ?? COULEUR_PAR_DEFAUT}
            onChange={(evenement) => {
              changer({ ...theme, couleur: evenement.target.value });
            }}
          />
          {lisible !== undefined && (
            <p className="aide">Assombrie en {lisible} pour rester lisible sur fond blanc.</p>
          )}
          {theme.couleur !== undefined && (
            <button
              type="button"
              onClick={() => {
                changer(sansCouleur);
              }}
            >
              Sans couleur
            </button>
          )}
        </div>
        <div className="champ">
          <label htmlFor="logo-du-prospect">Logo (PNG, JPEG ou WebP)</label>
          <input
            id="logo-du-prospect"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-invalid={erreurDeLogo !== undefined}
            onChange={(evenement) => {
              const [fichier] = evenement.target.files ?? [];
              evenement.target.value = '';
              if (fichier !== undefined) {
                void enUrlDeDonnees(fichier).then((logo) => {
                  changer({ ...theme, logo });
                });
              }
            }}
          />
          {erreurDeLogo !== undefined && <p role="alert">{erreurDeLogo}</p>}
          {theme.logo !== undefined && (
            <button
              type="button"
              onClick={() => {
                changer(sansLogo);
              }}
            >
              Retirer le logo
            </button>
          )}
        </div>
      </Section>
      {titre !== undefined && (
        <div className="apercu-du-titre" aria-label="Aperçu de la page de titre">
          <DiapositiveAffichee page={titre} />
        </div>
      )}
    </form>
  );
};
