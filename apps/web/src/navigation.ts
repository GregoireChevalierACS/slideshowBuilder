import type { DureeDePresentation, PublicVise } from '@slideshow/domain';
import { useEffect, useState } from 'react';

/** Ce qui détermine le deck présenté. Sans version : la dernière enregistrée. */
export interface ReglagesDePresentation {
  readonly public: PublicVise;
  readonly duree: DureeDePresentation;
  readonly version?: number;
}

export type Route =
  | { readonly ecran: 'accueil' }
  | { readonly ecran: 'parametres' }
  | { readonly ecran: 'entretien'; readonly id: string }
  | {
      readonly ecran: 'presentation';
      readonly id: string;
      readonly reglages: ReglagesDePresentation;
    }
  | {
      readonly ecran: 'presentateur';
      readonly id: string;
      readonly reglages: ReglagesDePresentation;
    };

const PUBLICS: readonly PublicVise[] = ['dirigeant', 'technique'];
const DUREES: readonly DureeDePresentation[] = ['courte', 'complete'];

const parmi = <V extends string>(choix: readonly V[], valeur: string | null, defaut: V): V =>
  choix.find((c) => c === valeur) ?? defaut;

/** Des réglages absents ou invalides prennent les valeurs par défaut, sans erreur. */
const lireLesReglages = (requete: string): ReglagesDePresentation => {
  const parametres = new URLSearchParams(requete);
  const version = Number(parametres.get('version'));
  return {
    public: parmi(PUBLICS, parametres.get('public'), 'dirigeant'),
    duree: parmi(DUREES, parametres.get('duree'), 'complete'),
    ...(Number.isInteger(version) && version >= 1 ? { version } : {}),
  };
};

const ecrireLesReglages = ({ public: publicVise, duree, version }: ReglagesDePresentation) =>
  new URLSearchParams({
    public: publicVise,
    duree,
    ...(version === undefined ? {} : { version: String(version) }),
  }).toString();

/** Navigation par l'ancre de l'URL : aucun routeur à configurer côté serveur. */
export const lireLaRoute = (ancre: string): Route => {
  const [chemin = '', requete = ''] = ancre.replace(/^#/, '').split('?');
  if (chemin === '/parametres') return { ecran: 'parametres' };
  const [, id, ecran] =
    /^\/diagnostics\/([^/]+)(?:\/(presentation|presentateur))?$/.exec(chemin) ?? [];
  if (id === undefined) return { ecran: 'accueil' };
  const identifiant = decodeURIComponent(id);
  if (ecran === undefined) return { ecran: 'entretien', id: identifiant };
  return {
    ecran: ecran === 'presentation' ? 'presentation' : 'presentateur',
    id: identifiant,
    reglages: lireLesReglages(requete),
  };
};

export const lienVers = (route: Route): string => {
  switch (route.ecran) {
    case 'accueil':
      return '#/';
    case 'parametres':
      return '#/parametres';
    case 'entretien':
      return `#/diagnostics/${encodeURIComponent(route.id)}`;
    case 'presentation':
    case 'presentateur':
      return `#/diagnostics/${encodeURIComponent(route.id)}/${route.ecran}?${ecrireLesReglages(route.reglages)}`;
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
