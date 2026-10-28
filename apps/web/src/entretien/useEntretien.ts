import { lireLaSaisie, type SaisieDeDiagnostic, type SaisieInvalide } from '@slideshow/application';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientDeLApi } from '../api/clientDeLApi.js';
import { messageDErreur } from '../api/messageDErreur.js';

export type Chargement =
  | { readonly etat: 'chargement' }
  | { readonly etat: 'pret' }
  | { readonly etat: 'erreur'; readonly message: string };

/** Chaque état est affiché : l'utilisateur sait toujours si sa saisie est en sécurité. */
export type EtatDeSauvegarde =
  | { readonly etat: 'enregistre'; readonly version: number }
  | { readonly etat: 'en-attente' }
  | { readonly etat: 'enregistrement' }
  /** Refusée par le domaine : rien n'est envoyé tant que le champ n'est pas corrigé. */
  | { readonly etat: 'a-completer'; readonly erreur: SaisieInvalide }
  /** Un autre onglet a enregistré entre-temps (409). */
  | { readonly etat: 'conflit'; readonly versionActuelle: number | undefined }
  | { readonly etat: 'echec'; readonly message: string };

/**
 * L'entretien en cours : la saisie locale, et sa sauvegarde automatique un court instant après la
 * dernière frappe. Les enregistrements sont sérialisés et partent toujours de la dernière version
 * connue du serveur (concurrence optimiste).
 */
export const useEntretien = (
  client: ClientDeLApi,
  id: string,
  { delai = 1_000 }: { readonly delai?: number } = {},
) => {
  const [chargement, setChargement] = useState<Chargement>({ etat: 'chargement' });
  const [saisie, setSaisie] = useState<SaisieDeDiagnostic>();
  const [sauvegarde, setSauvegarde] = useState<EtatDeSauvegarde>({
    etat: 'enregistre',
    version: 0,
  });

  const version = useRef(0);
  const derniere = useRef<SaisieDeDiagnostic>(undefined);
  const minuterie = useRef<ReturnType<typeof setTimeout>>(undefined);
  const file = useRef<Promise<void>>(Promise.resolve());

  const appliquer = useCallback(
    (charge: Awaited<ReturnType<ClientDeLApi['consulterUnDiagnostic']>>) => {
      if (!charge.ok) {
        setChargement({ etat: 'erreur', message: messageDErreur(charge.error) });
        return;
      }
      version.current = charge.value.version;
      derniere.current = charge.value.saisie;
      setSaisie(charge.value.saisie);
      setSauvegarde({ etat: 'enregistre', version: charge.value.version });
      setChargement({ etat: 'pret' });
    },
    [],
  );

  const recharger = useCallback(async () => {
    clearTimeout(minuterie.current);
    appliquer(await client.consulterUnDiagnostic(id));
  }, [appliquer, client, id]);

  useEffect(() => {
    void client.consulterUnDiagnostic(id).then(appliquer);
    return () => {
      clearTimeout(minuterie.current);
    };
  }, [appliquer, client, id]);

  const enregistrer = useCallback(
    async (envoyee: SaisieDeDiagnostic) => {
      setSauvegarde({ etat: 'enregistrement' });
      const { prospect, hypotheses, processus } = envoyee;
      const revise = await client.reviserUnDiagnostic(id, version.current, {
        prospect,
        hypotheses,
        processus,
      });

      if (revise.ok) {
        version.current = revise.value.version;
        // Si l'utilisateur a continué à taper, un autre enregistrement est déjà planifié.
        if (derniere.current === envoyee) {
          setSauvegarde({ etat: 'enregistre', version: revise.value.version });
        }
      } else if (revise.error.kind === 'Probleme' && revise.error.probleme.status === 409) {
        setSauvegarde({ etat: 'conflit', versionActuelle: revise.error.probleme.versionActuelle });
      } else {
        setSauvegarde({ etat: 'echec', message: messageDErreur(revise.error) });
      }
    },
    [client, id],
  );

  const modifier = useCallback(
    (nouvelle: SaisieDeDiagnostic) => {
      derniere.current = nouvelle;
      setSaisie(nouvelle);
      clearTimeout(minuterie.current);

      const lue = lireLaSaisie(nouvelle, 1);
      if (!lue.ok) {
        setSauvegarde({ etat: 'a-completer', erreur: lue.error });
        return;
      }
      setSauvegarde({ etat: 'en-attente' });
      minuterie.current = setTimeout(() => {
        // La minuterie repart à chaque frappe : la saisie capturée ici est bien la dernière.
        file.current = file.current.then(() => enregistrer(nouvelle));
      }, delai);
    },
    [delai, enregistrer],
  );

  const nonEnregistre = sauvegarde.etat !== 'enregistre';
  useEffect(() => {
    if (!nonEnregistre) return;
    const retenir = (evenement: BeforeUnloadEvent) => {
      evenement.preventDefault();
    };
    window.addEventListener('beforeunload', retenir);
    return () => {
      window.removeEventListener('beforeunload', retenir);
    };
  }, [nonEnregistre]);

  return { chargement, saisie, sauvegarde, modifier, recharger };
};
