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
  ])('« %s » mène à %o', (ancre, route) => {
    expect(lireLaRoute(ancre)).toStrictEqual(route);
  });

  it.each([
    [{ ecran: 'accueil' } as const, '#/'],
    [{ ecran: 'parametres' } as const, '#/parametres'],
    [{ ecran: 'entretien', id: 'a/b' } as const, '#/diagnostics/a%2Fb'],
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
