import { useEffect, useState } from 'react';
import type { ClientDeLApi, DiagnosticPublie } from '../api/clientDeLApi.js';
import { messageDErreur } from '../api/messageDErreur.js';
import { lienVers } from '../navigation.js';

type EtatDuDiagnostic =
  | { readonly etat: 'chargement' }
  | { readonly etat: 'charge'; readonly diagnostic: DiagnosticPublie }
  | { readonly etat: 'erreur'; readonly message: string };

/** L'écran d'entretien. Version provisoire : la saisie des processus arrive à l'étape suivante. */
export const Entretien = ({
  client,
  id,
}: {
  readonly client: ClientDeLApi;
  readonly id: string;
}) => {
  const [etat, setEtat] = useState<EtatDuDiagnostic>({ etat: 'chargement' });

  useEffect(() => {
    void client.consulterUnDiagnostic(id).then((resultat) => {
      setEtat(
        resultat.ok
          ? { etat: 'charge', diagnostic: resultat.value }
          : { etat: 'erreur', message: messageDErreur(resultat.error) },
      );
    });
  }, [client, id]);

  return (
    <main className="entretien">
      <a href={lienVers({ ecran: 'accueil' })}>← Diagnostics</a>
      {etat.etat === 'erreur' && <p role="alert">{etat.message}</p>}
      {etat.etat === 'charge' && (
        <h1>
          {etat.diagnostic.saisie.prospect.nom} <small>· version {etat.diagnostic.version}</small>
        </h1>
      )}
    </main>
  );
};
