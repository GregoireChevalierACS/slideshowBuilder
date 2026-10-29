import type { DureeDePresentation, PublicVise } from '@slideshow/domain';
import { useEffect, useRef, useState } from 'react';
import type { ClientDeLApi } from '../api/clientDeLApi.js';
import { ChampDeChoix } from '../entretien/champs.js';
import { lienVers, naviguer, type ReglagesDePresentation } from '../navigation.js';
import { ouvrirLeCanal, type Canal, type OuvrirUnCanal } from '../presentation/canal.js';
import { DiapositiveAffichee } from '../presentation/Diapositive.js';
import { useDeck } from '../presentation/useDeck.js';

const PUBLICS: readonly (readonly [PublicVise, string])[] = [
  ['dirigeant', 'Dirigeant'],
  ['technique', 'Technique'],
];
const DUREES: readonly (readonly [DureeDePresentation, string])[] = [
  ['complete', 'Complète (environ 15 min)'],
  ['courte', 'Courte (environ 5 min)'],
];

const SUIVANTE = new Set(['ArrowRight', ' ', 'PageDown']);
const PRECEDENTE = new Set(['ArrowLeft', 'PageUp']);

/** Le lancement d'une présentation : réglages, aperçu, plein écran, vue présentateur et PDF. */
export const Presentation = ({
  client,
  id,
  reglages,
  ouvrirCanal = ouvrirLeCanal,
}: {
  readonly client: ClientDeLApi;
  readonly id: string;
  readonly reglages: ReglagesDePresentation;
  readonly ouvrirCanal?: OuvrirUnCanal;
}) => {
  const deck = useDeck(client, id, reglages);
  const nombre = deck.etat === 'pret' ? deck.pages.length : 0;
  const [courante, setCourante] = useState(0);
  const [enDiffusion, setEnDiffusion] = useState(false);
  const canal = useRef<Canal>(undefined);
  const pageCourante = useRef(courante);

  const aller = (numero: number) => {
    setCourante(Math.min(Math.max(0, numero), Math.max(0, nombre - 1)));
  };

  // La vue présentateur suit l'écran : chaque changement de page lui est annoncé.
  useEffect(() => {
    pageCourante.current = courante;
    canal.current?.envoyer({ type: 'page', numero: courante });
  }, [courante]);

  useEffect(() => {
    const ouvert = ouvrirCanal(id);
    canal.current = ouvert;
    const arreter = ouvert.ecouter((message) => {
      if (message.type === 'aller') setCourante(message.numero);
      if (message.type === 'demande')
        ouvert.envoyer({ type: 'page', numero: pageCourante.current });
    });
    return () => {
      arreter();
      ouvert.fermer();
    };
  }, [id, ouvrirCanal]);

  useEffect(() => {
    if (!enDiffusion) return;
    const commander = (evenement: KeyboardEvent) => {
      if (SUIVANTE.has(evenement.key)) setCourante((n) => Math.min(n + 1, nombre - 1));
      else if (PRECEDENTE.has(evenement.key)) setCourante((n) => Math.max(n - 1, 0));
      else if (evenement.key === 'Home') setCourante(0);
      else if (evenement.key === 'End') setCourante(nombre - 1);
      else if (evenement.key === 'Escape') setEnDiffusion(false);
      else return;
      evenement.preventDefault();
    };
    // Échap en plein écran est capté par le navigateur : la sortie du plein écran arrête aussi.
    const surSortieDuPleinEcran = () => {
      if (document.fullscreenElement === null) setEnDiffusion(false);
    };
    window.addEventListener('keydown', commander);
    document.addEventListener('fullscreenchange', surSortieDuPleinEcran);
    return () => {
      window.removeEventListener('keydown', commander);
      document.removeEventListener('fullscreenchange', surSortieDuPleinEcran);
    };
  }, [enDiffusion, nombre]);

  const diffuser = (depuis: number) => {
    aller(depuis);
    setEnDiffusion(true);
    // Le plein écran peut être absent (navigateurs anciens, tests) ou refusé : la diffusion marche sans.
    try {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    } catch {
      // Plein écran indisponible : la diffusion s'affiche dans la fenêtre.
    }
  };

  const regler = (changement: Partial<ReglagesDePresentation>) => {
    naviguer({ ecran: 'presentation', id, reglages: { ...reglages, ...changement } });
  };

  if (deck.etat === 'chargement') return <main className="presentation" aria-busy="true" />;
  if (deck.etat === 'erreur') {
    return (
      <main className="presentation">
        <a href={lienVers({ ecran: 'entretien', id })}>← Retour à l’entretien</a>
        <p role="alert">{deck.message}</p>
      </main>
    );
  }

  const versions = Array.from({ length: deck.derniereVersion }, (_, i) => deck.derniereVersion - i);

  return (
    <main className="presentation">
      <div className="ecran-de-lancement">
        <a href={lienVers({ ecran: 'entretien', id })}>← Retour à l’entretien</a>
        <h1>Présenter : {deck.prospect}</h1>
        <div className="reglages">
          <ChampDeChoix
            libelle="Public"
            valeur={reglages.public}
            choix={PUBLICS}
            modifier={(publicVise) => {
              regler({ public: publicVise });
            }}
          />
          <ChampDeChoix
            libelle="Durée"
            valeur={reglages.duree}
            choix={DUREES}
            modifier={(duree) => {
              regler({ duree });
            }}
          />
          <ChampDeChoix
            libelle="Version"
            valeur={String(deck.version)}
            choix={versions.map(
              (v) =>
                [
                  String(v),
                  v === deck.derniereVersion ? `${String(v)} (dernière)` : String(v),
                ] as const,
            )}
            modifier={(version) => {
              regler({ version: Number(version) });
            }}
          />
        </div>
        <div className="actions">
          <button
            type="button"
            // L'écran s'ouvre pour présenter : Entrée lance aussitôt.
            autoFocus
            onClick={() => {
              diffuser(courante);
            }}
          >
            Présenter en plein écran
          </button>
          <button
            type="button"
            onClick={() => {
              window.open(
                lienVers({
                  ecran: 'presentateur',
                  id,
                  reglages: { ...reglages, version: deck.version },
                }),
                'slideshow-presentateur',
                'popup',
              );
            }}
          >
            Ouvrir la vue présentateur
          </button>
          <button
            type="button"
            onClick={() => {
              window.print();
            }}
          >
            Exporter en PDF
          </button>
        </div>
        <ol className="apercu" aria-label="Aperçu des diapositives">
          {deck.pages.map((page, numero) => (
            <li key={numero}>
              <button
                type="button"
                className="miniature"
                aria-label={`Présenter à partir de la diapositive ${String(numero + 1)}`}
                aria-current={numero === courante}
                onClick={() => {
                  diffuser(numero);
                }}
              >
                <DiapositiveAffichee page={page} />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="scene" hidden={!enDiffusion} aria-label="Diffusion" role="region">
        {deck.pages.slice(courante, courante + 1).map((page) => (
          <DiapositiveAffichee key={courante} page={page} />
        ))}
        <p className="compteur">
          {courante + 1} / {nombre}
        </p>
      </div>

      {/* Le PDF : toutes les diapositives, une par page imprimée (voir @media print). */}
      <div className="impression" aria-hidden="true">
        {deck.pages.map((page, numero) => (
          <DiapositiveAffichee key={numero} page={page} />
        ))}
      </div>
    </main>
  );
};
