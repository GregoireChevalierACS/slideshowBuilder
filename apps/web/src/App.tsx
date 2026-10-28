import type { ClientDeLApi } from './api/clientDeLApi.js';
import { Accueil } from './ecrans/Accueil.js';
import { Entretien } from './ecrans/Entretien.js';
import { Parametres } from './ecrans/Parametres.js';
import { lienVers, naviguer, useRoute } from './navigation.js';
import { FournisseurDeRaccourcis } from './raccourcis/ContexteDesRaccourcis.js';

/** L'interface : les dépendances (client de l'API, stockage du navigateur) sont injectées. */
export const App = ({
  client,
  stockage,
}: {
  readonly client: ClientDeLApi;
  readonly stockage: Storage | undefined;
}) => {
  const route = useRoute();

  return (
    <FournisseurDeRaccourcis stockage={stockage}>
      <nav className="navigation">
        <a href={lienVers({ ecran: 'accueil' })}>Diagnostics</a>
        <a href={lienVers({ ecran: 'parametres' })}>Paramètres</a>
      </nav>
      {route.ecran === 'accueil' && (
        <Accueil
          client={client}
          ouvrir={(id) => {
            naviguer({ ecran: 'entretien', id });
          }}
        />
      )}
      {route.ecran === 'parametres' && <Parametres />}
      {route.ecran === 'entretien' && <Entretien client={client} id={route.id} />}
    </FournisseurDeRaccourcis>
  );
};
