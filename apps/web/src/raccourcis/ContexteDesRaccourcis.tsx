import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  chargerLesRaccourcis,
  correspond,
  enregistrerLesRaccourcis,
  RACCOURCIS_PAR_DEFAUT,
  type ActionClavier,
  type Raccourcis,
} from './raccourcis.js';

interface ValeurDuContexte {
  readonly raccourcis: Raccourcis;
  /** Faux quand le navigateur a refusé d'enregistrer (navigation privée, quota). */
  readonly enregistres: boolean;
  readonly modifier: (raccourcis: Raccourcis) => void;
}

const Contexte = createContext<ValeurDuContexte>({
  raccourcis: RACCOURCIS_PAR_DEFAUT,
  enregistres: true,
  modifier: () => undefined,
});

export const FournisseurDeRaccourcis = ({
  stockage,
  children,
}: {
  readonly stockage: Storage | undefined;
  readonly children: ReactNode;
}) => {
  const [raccourcis, setRaccourcis] = useState(() => chargerLesRaccourcis(stockage));
  const [enregistres, setEnregistres] = useState(true);

  const modifier = (nouveaux: Raccourcis) => {
    setRaccourcis(nouveaux);
    setEnregistres(enregistrerLesRaccourcis(stockage, nouveaux));
  };

  return (
    <Contexte.Provider value={{ raccourcis, enregistres, modifier }}>{children}</Contexte.Provider>
  );
};

export const useRaccourcis = (): ValeurDuContexte => useContext(Contexte);

const estUnChampDeSaisie = (cible: EventTarget | null): boolean =>
  cible instanceof HTMLElement &&
  (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName));

/**
 * Déclenche `action` quand son raccourci est tapé. Un raccourci sans Ctrl ni Alt est ignoré dans un
 * champ de saisie : taper « n » dans un nom ne doit pas ouvrir un nouveau diagnostic.
 */
export const useRaccourci = (action: ActionClavier, gerer: () => void): void => {
  const { raccourcis } = useRaccourcis();
  const raccourci = raccourcis[action];
  // La dernière version du gestionnaire, sans réabonner l'écouteur à chaque rendu.
  const gestionnaire = useRef(gerer);
  useEffect(() => {
    gestionnaire.current = gerer;
  });

  useEffect(() => {
    const ecouter = (evenement: KeyboardEvent) => {
      if (!correspond(evenement, raccourci)) return;
      if (!raccourci.ctrl && !raccourci.alt && estUnChampDeSaisie(evenement.target)) return;
      evenement.preventDefault();
      gestionnaire.current();
    };
    window.addEventListener('keydown', ecouter);
    return () => {
      window.removeEventListener('keydown', ecouter);
    };
  }, [raccourci]);
};
