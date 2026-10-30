import { useState } from 'react';
import { urlDeLExport, type ClientDeLApi, type CompteRenduDImport } from '../api/clientDeLApi.js';
import { messageDErreur } from '../api/messageDErreur.js';

type Import =
  | { readonly etat: 'aucun' }
  | { readonly etat: 'termine'; readonly compteRendu: CompteRenduDImport }
  | { readonly etat: 'refuse'; readonly message: string };

const versions = (nombre: number) => `${String(nombre)} version${nombre > 1 ? 's' : ''}`;

/** Ce qu'est devenu chaque diagnostic du fichier, dit simplement. */
export const devenirDuDiagnostic = ({
  statut,
  versionsAjoutees,
}: CompteRenduDImport[number]): string => {
  switch (statut) {
    case 'importe':
      return `importé (${versions(versionsAjoutees)})`;
    case 'complete':
      return `complété (${versions(versionsAjoutees)} de plus)`;
    case 'aJour':
      return 'déjà à jour sur ce poste';
    case 'divergent':
      return versionsAjoutees === 0
        ? 'non importé : il a été modifié ici aussi, son historique diffère'
        : `interrompu : modifié ici pendant l’import, après ${versions(versionsAjoutees)} ajoutée${versionsAjoutees > 1 ? 's' : ''}`;
  }
};

/**
 * Sauvegarde et changement de poste : tout exporter dans un fichier, ou importer un fichier exporté.
 * Un import n'écrase jamais rien.
 */
export const Sauvegarde = ({
  client,
  apresImport,
}: {
  readonly client: ClientDeLApi;
  readonly apresImport: () => void;
}) => {
  const [dernierImport, setDernierImport] = useState<Import>({ etat: 'aucun' });

  const importer = async (fichier: File) => {
    const importe = await client.importerDesDiagnostics(await fichier.text());
    setDernierImport(
      importe.ok
        ? { etat: 'termine', compteRendu: importe.value }
        : { etat: 'refuse', message: messageDErreur(importe.error) },
    );
    if (importe.ok) apresImport();
  };

  return (
    <section className="sauvegarde" aria-label="Sauvegarde">
      <a href={urlDeLExport()} download>
        Tout exporter
      </a>
      <label className="bouton">
        Importer un export…
        <input
          type="file"
          accept=".json,application/json"
          onChange={(evenement) => {
            const [fichier] = evenement.target.files ?? [];
            // Le même fichier choisi deux fois doit déclencher un nouvel import.
            evenement.target.value = '';
            if (fichier !== undefined) void importer(fichier);
          }}
        />
      </label>
      {dernierImport.etat === 'refuse' && <p role="alert">{dernierImport.message}</p>}
      {dernierImport.etat === 'termine' && (
        <div role="status">
          {dernierImport.compteRendu.length === 0 ? (
            <p>Ce fichier ne contient aucun diagnostic.</p>
          ) : (
            <ul>
              {dernierImport.compteRendu.map((resultat) => (
                <li key={resultat.id}>
                  <strong>{resultat.prospect}</strong> : {devenirDuDiagnostic(resultat)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
