import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '@slideshow/application/testing';
import { err, ok } from '@slideshow/domain';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClientDeLApi } from '../api/clientDeLApi.js';
import type { ReglagesDePresentation } from '../navigation.js';
import { useDeck } from './useDeck.js';

const versions = {
  1: uneSaisieDeDiagnostic({ prospect: { nom: 'Ancien nom' }, processus: [] }),
  2: uneSaisieDeDiagnostic({ processus: [uneSaisieDeProcessus()] }),
};

const unClient = (consulter?: ClientDeLApi['consulterUnDiagnostic']): ClientDeLApi => ({
  listerLesDiagnostics: vi.fn(),
  ouvrirUnDiagnostic: vi.fn(),
  importerDesDiagnostics: vi.fn(),
  reviserUnDiagnostic: vi.fn(),
  consulterUnDiagnostic:
    consulter ??
    vi.fn((_id: string, version?: number) =>
      Promise.resolve(
        ok({ id: 'd', version: version ?? 2, saisie: version === 1 ? versions[1] : versions[2] }),
      ),
    ),
});

const charger = async (client: ClientDeLApi, reglages: ReglagesDePresentation) => {
  const { result } = renderHook(() => useDeck(client, 'd', reglages));
  await waitFor(() => {
    expect(result.current.etat).not.toBe('chargement');
  });
  return result.current;
};

describe('useDeck', () => {
  it('construit le deck de la dernière version', async () => {
    const client = unClient();

    const deck = await charger(client, { public: 'dirigeant', duree: 'courte' });

    expect(deck).toMatchObject({
      etat: 'pret',
      prospect: 'Négoce Durand',
      version: 2,
      derniereVersion: 2,
    });
    expect(deck.etat === 'pret' && deck.pages.map((p) => p.diapositive.kind)).toStrictEqual([
      'Titre',
      'CoutCache',
      'Architecture',
      'GainsAttendus',
      'FeuilleDeRoute',
    ]);
    expect(client.consulterUnDiagnostic).toHaveBeenCalledTimes(1);
  });

  it('construit le deck d’une version précédente, et connaît la dernière', async () => {
    const deck = await charger(unClient(), { public: 'technique', duree: 'complete', version: 1 });

    expect(deck).toMatchObject({
      etat: 'pret',
      prospect: 'Ancien nom',
      version: 1,
      derniereVersion: 2,
    });
  });

  it('explique un diagnostic injoignable', async () => {
    const deck = await charger(
      unClient(vi.fn(() => Promise.resolve(err({ kind: 'Injoignable' as const })))),
      {
        public: 'dirigeant',
        duree: 'courte',
      },
    );

    expect(deck.etat).toBe('erreur');
    expect(JSON.stringify(deck)).toContain('ne répond pas');
  });

  it('explique une version introuvable', async () => {
    const consulter = vi.fn((_id: string, version?: number) =>
      Promise.resolve(
        version === undefined
          ? ok({ id: 'd', version: 2, saisie: versions[2] })
          : err({
              kind: 'Probleme' as const,
              probleme: {
                type: '/problemes/diagnostic-introuvable',
                title: 'Introuvable',
                status: 404,
                detail: 'Pas de version 9.',
              },
            }),
      ),
    );

    expect(
      await charger(unClient(consulter), { public: 'dirigeant', duree: 'courte', version: 9 }),
    ).toStrictEqual({
      etat: 'erreur',
      message: 'Pas de version 9.',
    });
  });

  it('refuse de présenter une version que le domaine ne sait plus lire', async () => {
    const illisible = uneSaisieDeDiagnostic({
      processus: [uneSaisieDeProcessus({ personnes: 0 })],
    });

    expect(
      await charger(
        unClient(vi.fn(() => Promise.resolve(ok({ id: 'd', version: 1, saisie: illisible })))),
        {
          public: 'dirigeant',
          duree: 'courte',
        },
      ),
    ).toStrictEqual({
      etat: 'erreur',
      message:
        'Cette version ne peut pas être présentée : le champ « processus[0].personnes » est à corriger.',
    });
  });

  it('ignore un chargement devenu obsolète quand les réglages changent', async () => {
    const client = unClient();
    const { result, rerender } = renderHook(
      (reglages: ReglagesDePresentation) => useDeck(client, 'd', reglages),
      {
        initialProps: { public: 'dirigeant', duree: 'courte' },
      },
    );

    rerender({ public: 'technique', duree: 'complete' });

    await waitFor(() => {
      expect(result.current.etat === 'pret' && result.current.pages.length).toBeGreaterThan(5);
    });
  });
});
