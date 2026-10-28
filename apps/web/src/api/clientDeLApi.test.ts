import { uneSaisieDeDiagnostic } from '@slideshow/application/testing';
import { describe, expect, it, vi } from 'vitest';
import { creerLeClientDeLApi } from './clientDeLApi.js';

type Appel = (url: string, options?: RequestInit) => Promise<Response>;

const repondre = (statut: number, corps: unknown) =>
  vi.fn<Appel>(() =>
    Promise.resolve(
      new Response(corps === undefined ? null : JSON.stringify(corps), {
        status: statut,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );

const publie = (version = 1) => ({ id: 'diagnostic-1', version, saisie: uneSaisieDeDiagnostic() });

describe('client de l’API', () => {
  it('liste les diagnostics', async () => {
    const resume = {
      id: 'a',
      prospect: 'Négoce',
      dateDEntretien: '2026-10-28',
      derniereVersion: 2,
    };
    const appel = repondre(200, [resume]);

    expect(await creerLeClientDeLApi(appel).listerLesDiagnostics()).toStrictEqual({
      ok: true,
      value: [resume],
    });
    expect(appel).toHaveBeenCalledWith('/api/diagnostics', undefined);
  });

  it('ouvre un diagnostic en envoyant le prospect en JSON', async () => {
    const appel = repondre(201, publie());

    expect(await creerLeClientDeLApi(appel).ouvrirUnDiagnostic({ nom: 'Négoce' })).toStrictEqual({
      ok: true,
      value: publie(),
    });
    expect(appel).toHaveBeenCalledWith('/api/diagnostics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nom: 'Négoce' }),
    });
  });

  it('consulte la dernière version, ou une version précise', async () => {
    const appel = repondre(200, publie());
    const client = creerLeClientDeLApi(appel);

    await client.consulterUnDiagnostic('diagnostic-1');
    await client.consulterUnDiagnostic('diagnostic-1', 3);

    expect(appel.mock.calls.map(([url]) => url)).toStrictEqual([
      '/api/diagnostics/diagnostic-1',
      '/api/diagnostics/diagnostic-1?version=3',
    ]);
  });

  it('révise en indiquant la version que l’utilisateur a sous les yeux', async () => {
    const appel = repondre(200, publie(2));
    const { prospect, hypotheses, processus } = uneSaisieDeDiagnostic();

    const revise = await creerLeClientDeLApi(appel).reviserUnDiagnostic('diagnostic-1', 1, {
      prospect,
      hypotheses,
      processus,
    });

    expect(revise).toStrictEqual({ ok: true, value: publie(2) });
    expect(appel).toHaveBeenCalledWith('/api/diagnostics/diagnostic-1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ versionAttendue: 1, prospect, hypotheses, processus }),
    });
  });

  it('encode l’identifiant dans l’URL', async () => {
    const appel = repondre(200, publie());

    await creerLeClientDeLApi(appel).consulterUnDiagnostic('a/b?c');

    expect(appel).toHaveBeenCalledWith('/api/diagnostics/a%2Fb%3Fc', undefined);
  });

  it('rend le problème signalé par le serveur', async () => {
    const probleme = {
      type: '/problemes/version-perimee',
      title: 'Version périmée',
      status: 409,
      detail: 'La version 1 n’est plus la dernière.',
      versionActuelle: 2,
    };

    expect(
      await creerLeClientDeLApi(repondre(409, probleme)).consulterUnDiagnostic('a'),
    ).toStrictEqual({
      ok: false,
      error: { kind: 'Probleme', probleme },
    });
  });

  it('utilise le fetch du navigateur par défaut', async () => {
    const fetchDuNavigateur = repondre(200, []);
    vi.stubGlobal('fetch', fetchDuNavigateur);
    try {
      expect(await creerLeClientDeLApi().listerLesDiagnostics()).toStrictEqual({
        ok: true,
        value: [],
      });
      expect(fetchDuNavigateur).toHaveBeenCalledWith('/api/diagnostics', undefined);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('signale un serveur injoignable', async () => {
    const appel = vi.fn<Appel>(() => Promise.reject(new TypeError('Failed to fetch')));

    expect(await creerLeClientDeLApi(appel).listerLesDiagnostics()).toStrictEqual({
      ok: false,
      error: { kind: 'Injoignable' },
    });
  });

  it.each([
    ['une réponse réussie qui ne respecte pas le contrat', 200, [{ id: 42 }]],
    ['une erreur qui n’est pas en Problem Details', 502, undefined],
  ])('signale %s', async (_cas, statut, corps) => {
    expect(await creerLeClientDeLApi(repondre(statut, corps)).listerLesDiagnostics()).toStrictEqual(
      {
        ok: false,
        error: { kind: 'ReponseInattendue', statut },
      },
    );
  });
});
