import type { SaisieDeDiagnostic } from '@slideshow/application';
import { DateLocale } from '@slideshow/domain';
import { useEffect, useState } from 'react';
import type { ClientDeLApi, ResumeDeDiagnostic } from '../api/clientDeLApi.js';
import { messageDErreur } from '../api/messageDErreur.js';
import { lienVers } from '../navigation.js';
import { useRaccourci, useRaccourcis } from '../raccourcis/ContexteDesRaccourcis.js';
import { libelle } from '../raccourcis/raccourcis.js';
import { Sauvegarde } from '../sauvegarde/Sauvegarde.js';

type EtatDeLaListe =
  | { readonly etat: 'chargement' }
  | { readonly etat: 'chargee'; readonly diagnostics: readonly ResumeDeDiagnostic[] }
  | { readonly etat: 'erreur'; readonly message: string };

const enToutesLettres = (iso: string): string => {
  const date = DateLocale.depuisIso(iso);
  return date.ok ? date.value.enToutesLettres : iso;
};

const FormulaireDOuverture = ({
  client,
  ouvrir,
  fermer,
}: {
  readonly client: ClientDeLApi;
  readonly ouvrir: (id: string) => void;
  readonly fermer: () => void;
}) => {
  const [nom, setNom] = useState('');
  const [secteur, setSecteur] = useState('');
  const [effectif, setEffectif] = useState('');
  const [refus, setRefus] = useState<string>();

  const valider = async () => {
    // Les champs facultatifs laissés vides ne sont pas envoyés (et non envoyés vides).
    const prospect: SaisieDeDiagnostic['prospect'] = {
      nom,
      ...(secteur.trim() === '' ? {} : { secteur }),
      ...(effectif.trim() === '' ? {} : { effectifTotal: Number(effectif) }),
    };
    const ouvert = await client.ouvrirUnDiagnostic(prospect);
    if (ouvert.ok) ouvrir(ouvert.value.id);
    else setRefus(messageDErreur(ouvert.error));
  };

  return (
    <form
      className="formulaire-d-ouverture"
      onSubmit={(evenement) => {
        evenement.preventDefault();
        void valider();
      }}
      onKeyDown={(evenement) => {
        if (evenement.key === 'Escape') fermer();
      }}
    >
      <label>
        Nom du prospect
        <input
          // Le formulaire s'ouvre par un raccourci : la saisie commence aussitôt.
          autoFocus
          value={nom}
          onChange={(e) => {
            setNom(e.target.value);
          }}
        />
      </label>
      <label>
        Secteur
        <input
          value={secteur}
          onChange={(e) => {
            setSecteur(e.target.value);
          }}
        />
      </label>
      <label>
        Effectif
        <input
          inputMode="numeric"
          value={effectif}
          onChange={(e) => {
            setEffectif(e.target.value);
          }}
        />
      </label>
      <button type="submit">Ouvrir le diagnostic</button>
      {refus !== undefined && <p role="alert">{refus}</p>}
    </form>
  );
};

/** La liste des diagnostics et l'ouverture d'un nouveau. */
export const Accueil = ({
  client,
  ouvrir,
}: {
  readonly client: ClientDeLApi;
  readonly ouvrir: (id: string) => void;
}) => {
  const [liste, setListe] = useState<EtatDeLaListe>({ etat: 'chargement' });
  const [enCreation, setEnCreation] = useState(false);
  // Incrémenté après un import : la liste est rechargée.
  const [chargements, setChargements] = useState(0);
  const { raccourcis } = useRaccourcis();
  useRaccourci('nouveauDiagnostic', () => {
    setEnCreation(true);
  });

  useEffect(() => {
    void client.listerLesDiagnostics().then((resultat) => {
      setListe(
        resultat.ok
          ? { etat: 'chargee', diagnostics: resultat.value }
          : { etat: 'erreur', message: messageDErreur(resultat.error) },
      );
    });
  }, [client, chargements]);

  return (
    <main className="accueil">
      <h1>Diagnostics d’automatisation</h1>
      {enCreation ? (
        <FormulaireDOuverture
          client={client}
          ouvrir={ouvrir}
          fermer={() => {
            setEnCreation(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEnCreation(true);
          }}
        >
          Nouveau diagnostic <kbd>{libelle(raccourcis.nouveauDiagnostic)}</kbd>
        </button>
      )}

      <Sauvegarde
        client={client}
        apresImport={() => {
          setChargements((n) => n + 1);
        }}
      />

      {liste.etat === 'erreur' && <p role="alert">{liste.message}</p>}
      {liste.etat === 'chargee' && liste.diagnostics.length === 0 && (
        <p>Aucun diagnostic pour l’instant : ouvrez le premier pendant votre prochain entretien.</p>
      )}
      {liste.etat === 'chargee' && liste.diagnostics.length > 0 && (
        <ul className="liste-des-diagnostics">
          {liste.diagnostics.map((d) => (
            <li key={d.id}>
              <a href={lienVers({ ecran: 'entretien', id: d.id })}>
                <strong>{d.prospect}</strong> — {enToutesLettres(d.dateDEntretien)} · version{' '}
                {d.derniereVersion}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};
