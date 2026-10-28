import { useEffect, useState } from 'react';
import { lienVers } from '../navigation.js';
import { useRaccourcis } from '../raccourcis/ContexteDesRaccourcis.js';
import {
  ACTIONS_CLAVIER,
  conflits,
  depuisEvenement,
  libelle,
  LIBELLES_DES_ACTIONS,
  RACCOURCIS_PAR_DEFAUT,
  type ActionClavier,
} from '../raccourcis/raccourcis.js';

/** Personnalisation des raccourcis clavier, retenue par ce navigateur. */
export const Parametres = () => {
  const { raccourcis, enregistres, modifier } = useRaccourcis();
  const [enCapture, setEnCapture] = useState<ActionClavier>();

  useEffect(() => {
    if (enCapture === undefined) return;
    const capturer = (evenement: KeyboardEvent) => {
      // Phase de capture : la combinaison tapée ne déclenche aucune autre action de l'interface.
      evenement.preventDefault();
      evenement.stopImmediatePropagation();
      if (evenement.key === 'Escape') {
        setEnCapture(undefined);
        return;
      }
      const raccourci = depuisEvenement(evenement);
      if (raccourci === undefined) return;
      modifier({ ...raccourcis, [enCapture]: raccourci });
      setEnCapture(undefined);
    };
    window.addEventListener('keydown', capturer, { capture: true });
    return () => {
      window.removeEventListener('keydown', capturer, { capture: true });
    };
  }, [enCapture, raccourcis, modifier]);

  return (
    <main className="parametres">
      <a href={lienVers({ ecran: 'accueil' })}>← Diagnostics</a>
      <h1>Paramètres</h1>
      <h2>Raccourcis clavier</h2>
      <table>
        <tbody>
          {ACTIONS_CLAVIER.map((action) => (
            <tr key={action}>
              <th scope="row">{LIBELLES_DES_ACTIONS[action]}</th>
              <td>
                <kbd>{libelle(raccourcis[action])}</kbd>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    setEnCapture(action);
                  }}
                >
                  Modifier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {enCapture !== undefined && (
        <p role="status">
          Tapez la nouvelle combinaison pour « {LIBELLES_DES_ACTIONS[enCapture]} » (Échap pour
          annuler).
        </p>
      )}
      {conflits(raccourcis).map((groupe) => (
        <p role="alert" key={groupe.join()}>
          {groupe.map((action) => LIBELLES_DES_ACTIONS[action]).join(' et ')} utilisent la même
          combinaison ({libelle(raccourcis[groupe[0]])}).
        </p>
      ))}
      {!enregistres && (
        <p>
          Ce navigateur refuse l’enregistrement : les modifications s’appliquent mais ne seront pas
          retenues au prochain démarrage.
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          modifier(RACCOURCIS_PAR_DEFAUT);
        }}
      >
        Rétablir les valeurs par défaut
      </button>
    </main>
  );
};
