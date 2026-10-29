import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { lienVers, lireLaRoute, naviguer, useRoute } from './navigation.js';

describe('navigation', () => {
  it.each([
    ['', { ecran: 'accueil' }],
    ['#/', { ecran: 'accueil' }],
    ['#/inconnu', { ecran: 'accueil' }],
    ['#/parametres', { ecran: 'parametres' }],
    ['#/diagnostics/abc-1', { ecran: 'entretien', id: 'abc-1' }],
    ['#/diagnostics/a%2Fb', { ecran: 'entretien', id: 'a/b' }],
    ['#/diagnostics/a/b', { ecran: 'accueil' }],
    [
      '#/diagnostics/a/presentation?public=technique&duree=courte&version=3',
      {
        ecran: 'presentation',
        id: 'a',
        reglages: { public: 'technique', duree: 'courte', version: 3 },
      },
    ],
    [
      '#/diagnostics/a/presentateur?public=dirigeant&duree=complete',
      { ecran: 'presentateur', id: 'a', reglages: { public: 'dirigeant', duree: 'complete' } },
    ],
    // Des réglages absents ou invalides prennent les valeurs par défaut : dirigeant, version complète.
    [
      '#/diagnostics/a/presentation',
      { ecran: 'presentation', id: 'a', reglages: { public: 'dirigeant', duree: 'complete' } },
    ],
    [
      '#/diagnostics/a/presentation?public=tous&duree=longue&version=deux',
      { ecran: 'presentation', id: 'a', reglages: { public: 'dirigeant', duree: 'complete' } },
    ],
    [
      '#/diagnostics/a/presentation?version=0',
      { ecran: 'presentation', id: 'a', reglages: { public: 'dirigeant', duree: 'complete' } },
    ],
  ])('« %s » mène à %o', (ancre, route) => {
    expect(lireLaRoute(ancre)).toStrictEqual(route);
  });

  it.each([
    [{ ecran: 'accueil' } as const, '#/'],
    [{ ecran: 'parametres' } as const, '#/parametres'],
    [{ ecran: 'entretien', id: 'a/b' } as const, '#/diagnostics/a%2Fb'],
    [
      {
        ecran: 'presentation',
        id: 'a',
        reglages: { public: 'technique', duree: 'courte', version: 2 },
      } as const,
      '#/diagnostics/a/presentation?public=technique&duree=courte&version=2',
    ],
    [
      {
        ecran: 'presentateur',
        id: 'a',
        reglages: { public: 'dirigeant', duree: 'complete' },
      } as const,
      '#/diagnostics/a/presentateur?public=dirigeant&duree=complete',
    ],
  ])('%o a pour lien %s', (route, lien) => {
    expect(lienVers(route)).toBe(lien);
    expect(lireLaRoute(lien)).toStrictEqual(route);
  });

  it('suit les changements d’ancre', async () => {
    const { result, unmount } = renderHook(() => useRoute());

    await act(async () => {
      naviguer({ ecran: 'parametres' });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toStrictEqual({ ecran: 'parametres' });
    unmount();
    naviguer({ ecran: 'accueil' });
  });
});
