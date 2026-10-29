import { useEffect, useRef, useState } from 'react';
import type { ClientDeLApi } from '../api/clientDeLApi.js';
import type { ReglagesDePresentation } from '../navigation.js';
import { ouvrirLeCanal, type OuvrirUnCanal } from '../presentation/canal.js';
import { DiapositiveAffichee } from '../presentation/Diapositive.js';
import { useDeck } from '../presentation/useDeck.js';

const enMinutes = (secondes: number) =>
  `${String(Math.floor(secondes / 60)).padStart(2, '0')}:${String(secondes % 60).padStart(2, '0')}`;

/**
 * La vue présentateur, dans une seconde fenêtre : la diapositive affichée, la suivante, les notes
 * (dont les alertes de cohérence, jamais montrées au client) et un chronomètre.
 */
export const Presentateur = ({
  client,
  id,
  reglages,
  ouvrirCanal = ouvrirLeCanal,
  maintenant = () => Date.now(),
}: {
  readonly client: ClientDeLApi;
  readonly id: string;
  readonly reglages: ReglagesDePresentation;
  readonly ouvrirCanal?: OuvrirUnCanal;
  readonly maintenant?: () => number;
}) => {
  const deck = useDeck(client, id, reglages);
  const nombre = deck.etat === 'pret' ? deck.pages.length : 0;
  const [courante, setCourante] = useState(0);
  const [debut, setDebut] = useState(maintenant);
  const [ecoule, setEcoule] = useState(0);

  // Les touches pilotent l'écran principal ; la page courante est lue au moment de la frappe.
  const position = useRef({ courante, nombre });
  useEffect(() => {
    position.current = { courante, nombre };
  });

  useEffect(() => {
    const ouvert = ouvrirCanal(id);
    const arreter = ouvert.ecouter((message) => {
      if (message.type === 'page') setCourante(message.numero);
    });
    ouvert.envoyer({ type: 'demande' });

    const commander = (evenement: KeyboardEvent) => {
      const { courante: actuelle, nombre: total } = position.current;
      const vers =
        evenement.key === 'ArrowRight' || evenement.key === ' ' || evenement.key === 'PageDown'
          ? Math.min(actuelle + 1, total - 1)
          : evenement.key === 'ArrowLeft' || evenement.key === 'PageUp'
            ? Math.max(actuelle - 1, 0)
            : undefined;
      if (vers === undefined) return;
      evenement.preventDefault();
      setCourante(vers);
      ouvert.envoyer({ type: 'aller', numero: vers });
    };
    window.addEventListener('keydown', commander);
    return () => {
      window.removeEventListener('keydown', commander);
      arreter();
      ouvert.fermer();
    };
  }, [id, ouvrirCanal]);

  useEffect(() => {
    const minuterie = setInterval(() => {
      setEcoule(Math.floor((maintenant() - debut) / 1_000));
    }, 1_000);
    return () => {
      clearInterval(minuterie);
    };
  }, [debut, maintenant]);

  if (deck.etat === 'chargement') return <main className="presentateur" aria-busy="true" />;
  if (deck.etat === 'erreur') {
    return (
      <main className="presentateur">
        <p role="alert">{deck.message}</p>
      </main>
    );
  }

  const [actuelle, suivante] = [
    deck.pages.slice(courante, courante + 1),
    deck.pages.slice(courante + 1, courante + 2),
  ];
  const notes = actuelle.flatMap((page) => page.diapositive.notes);

  return (
    <main className="presentateur">
      <header className="entete-du-presentateur">
        <p>
          Diapositive {courante + 1} / {nombre}
        </p>
        <p role="timer" aria-label="Temps écoulé">
          {enMinutes(ecoule)}
        </p>
        <button
          type="button"
          onClick={() => {
            setDebut(maintenant());
            setEcoule(0);
          }}
        >
          Remettre le chronomètre à zéro
        </button>
      </header>
      <div className="vues">
        <section aria-label="Diapositive affichée">
          {actuelle.map((page) => (
            <DiapositiveAffichee key={courante} page={page} />
          ))}
        </section>
        <section aria-label="Diapositive suivante">
          {suivante.length === 0 ? (
            <p>Fin de la présentation.</p>
          ) : (
            suivante.map((page) => <DiapositiveAffichee key={courante + 1} page={page} />)
          )}
        </section>
      </div>
      <section aria-label="Notes du présentateur" className="notes">
        <h2>Notes</h2>
        {notes.length === 0 ? (
          <p>Aucune note pour cette diapositive.</p>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};
