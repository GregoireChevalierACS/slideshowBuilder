import { useState } from 'react';
import { urlDeLExport, type ClientDeLApi } from '../api/clientDeLApi.js';
import {
  FormulaireDesHypotheses,
  IndicateurDeSauvegarde,
  ListeDesProcessus,
  type Selection,
} from '../entretien/elementsDeLEntretien.js';
import { FormulaireDuProcessus } from '../entretien/FormulaireDuProcessus.js';
import { PanneauEnDirect } from '../entretien/PanneauEnDirect.js';
import {
  ajouterUnProcessus,
  nomLibre,
  processusVierge,
  remplacerLeProcessus,
  retirerLeProcessus,
} from '../entretien/saisieDeTravail.js';
import { useEntretien } from '../entretien/useEntretien.js';
import { lienVers } from '../navigation.js';
import { useRaccourci } from '../raccourcis/ContexteDesRaccourcis.js';

/** L'écran de l'entretien : les processus, le formulaire du processus choisi, les chiffres en direct. */
export const Entretien = ({
  client,
  id,
  delai,
}: {
  readonly client: ClientDeLApi;
  readonly id: string;
  /** Délai de la sauvegarde automatique après la dernière frappe (raccourci dans les tests). */
  readonly delai?: number;
}) => {
  const { chargement, saisie, sauvegarde, modifier, recharger } = useEntretien(
    client,
    id,
    delai === undefined ? {} : { delai },
  );
  const [selection, setSelection] = useState<Selection>(0);
  const [nouveau, setNouveau] = useState(false);
  const nombre = saisie?.processus.length ?? 0;

  const choisir = (choix: Selection) => {
    setNouveau(false);
    setSelection(choix);
  };

  const ajouter = () => {
    if (saisie === undefined) return;
    modifier(ajouterUnProcessus(saisie, processusVierge(nomLibre(saisie, 'Nouveau processus'))));
    setNouveau(true);
    setSelection(saisie.processus.length);
  };

  useRaccourci('nouveauProcessus', ajouter);
  useRaccourci('processusPrecedent', () => {
    if (typeof selection === 'number' && selection > 0) choisir(selection - 1);
  });
  useRaccourci('processusSuivant', () => {
    if (typeof selection === 'number' && selection < nombre - 1) choisir(selection + 1);
  });

  if (chargement.etat === 'erreur') {
    return (
      <main className="entretien">
        <a href={lienVers({ ecran: 'accueil' })}>← Diagnostics</a>
        <p role="alert">{chargement.message}</p>
      </main>
    );
  }
  if (saisie === undefined) return <main className="entretien" aria-busy="true" />;

  const erreur = sauvegarde.etat === 'a-completer' ? sauvegarde.erreur : undefined;
  const choisi = typeof selection === 'number' ? saisie.processus[selection] : undefined;

  return (
    <main className="entretien">
      <header className="entete-de-l-entretien">
        <a href={lienVers({ ecran: 'accueil' })}>← Diagnostics</a>
        <h1>{saisie.prospect.nom}</h1>
        <a
          className="bouton-presenter"
          href={lienVers({
            ecran: 'presentation',
            id,
            reglages: { public: 'dirigeant', duree: 'complete' },
          })}
        >
          Présenter ▸
        </a>
        {/* L'historique enregistré : une frappe pas encore sauvegardée n'y figure pas. */}
        <a href={urlDeLExport(id)} download>
          Exporter
        </a>
        <IndicateurDeSauvegarde
          sauvegarde={sauvegarde}
          recharger={() => {
            void recharger();
          }}
        />
      </header>

      <div className="colonnes">
        <ListeDesProcessus
          noms={saisie.processus.map((p) => p.nom)}
          selection={selection}
          choisir={choisir}
          ajouter={ajouter}
        />

        <div className="colonne-centrale">
          {selection === 'hypotheses' && (
            <FormulaireDesHypotheses
              hypotheses={saisie.hypotheses}
              erreur={erreur}
              modifier={(hypotheses) => {
                modifier({ ...saisie, hypotheses });
              }}
            />
          )}
          {typeof selection === 'number' && choisi !== undefined && (
            <FormulaireDuProcessus
              // Un autre processus : un formulaire neuf, sans état hérité du précédent.
              key={selection}
              saisie={saisie}
              position={selection}
              processus={choisi}
              erreur={erreur}
              nouveau={nouveau}
              modifier={(processus) => {
                modifier(remplacerLeProcessus(saisie, selection, processus));
              }}
              supprimer={() => {
                modifier(retirerLeProcessus(saisie, selection));
                choisir(Math.max(0, selection - 1));
              }}
            />
          )}
          {selection !== 'hypotheses' && choisi === undefined && (
            <p className="invitation">
              Aucun processus pour l’instant : ajoutez le premier pour commencer l’entretien.
            </p>
          )}
        </div>

        <PanneauEnDirect saisie={saisie} processus={choisi} />
      </div>
    </main>
  );
};
