import { useEffect, useState } from 'react';

export type Route =
  | { readonly ecran: 'accueil' }
  | { readonly ecran: 'parametres' }
  | { readonly ecran: 'entretien'; readonly id: string };

/** Navigation par l'ancre de l'URL : aucun routeur à configurer côté serveur. */
export const lireLaRoute = (ancre: string): Route => {
  const chemin = ancre.replace(/^#/, '');
  if (chemin === '/parametres') return { ecran: 'parametres' };
  const entretien = /^\/diagnostics\/([^/]+)$/.exec(chemin)?.[1];
  return entretien === undefined
    ? { ecran: 'accueil' }
    : { ecran: 'entretien', id: decodeURIComponent(entretien) };
};

export const lienVers = (route: Route): string => {
  switch (route.ecran) {
    case 'accueil':
      return '#/';
    case 'parametres':
      return '#/parametres';
    case 'entretien':
      return `#/diagnostics/${encodeURIComponent(route.id)}`;
  }
};

export const naviguer = (route: Route): void => {
  window.location.hash = lienVers(route);
};

export const useRoute = (): Route => {
  const [route, setRoute] = useState(() => lireLaRoute(window.location.hash));
  useEffect(() => {
    const suivre = () => {
      setRoute(lireLaRoute(window.location.hash));
    };
    window.addEventListener('hashchange', suivre);
    return () => {
      window.removeEventListener('hashchange', suivre);
    };
  }, []);
  return route;
};
