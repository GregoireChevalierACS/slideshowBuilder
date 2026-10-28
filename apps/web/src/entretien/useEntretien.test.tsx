import type { SaisieDeDiagnostic } from '@slideshow/application';
import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '@slideshow/application/testing';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClientDeLApi, DiagnosticPublie, ErreurDApi } from '../api/clientDeLApi.js';
import type { Result } from '@slideshow/domain';
import { useEntretien } from './useEntretien.js';

const publie = (
  version: number,
  saisie: SaisieDeDiagnostic = uneSaisieDeDiagnostic(),
): DiagnosticPublie => ({
  id: 'd',
  version,
  saisie,
});

type Reponse = Result<DiagnosticPublie, ErreurDApi>;

const unClient = (
  consulter: () => Promise<Reponse> = () => Promise.resolve({ ok: true, value: publie(1) }),
  reviser: ClientDeLApi['reviserUnDiagnostic'] = vi.fn<ClientDeLApi['reviserUnDiagnostic']>(
    (_id, versionAttendue, modifications) =>
      Promise.resolve({
        ok: true as const,
        value: publie(versionAttendue + 1, { ...modifications, dateDEntretien: '2026-10-27' }),
      }),
  ),
): ClientDeLApi => ({
  listerLesDiagnostics: vi.fn(),
  ouvrirUnDiagnostic: vi.fn(),
  consulterUnDiagnostic: vi.fn(consulter),
  reviserUnDiagnostic: reviser,
});

const monter = async (client: ClientDeLApi) => {
  const rendu = renderHook(() => useEntretien(client, 'd', { delai: 0 }));
  await waitFor(() => {
    expect(rendu.result.current.chargement).toStrictEqual({ etat: 'pret' });
  });
  return rendu;
};

const conflit: ErreurDApi = {
  kind: 'Probleme',
  probleme: {
    type: '/problemes/version-perimee',
    title: 'Version périmée',
    status: 409,
    versionActuelle: 5,
  },
};

describe('useEntretien', () => {
  it('charge la dernière version du diagnostic', async () => {
    const { result } = await monter(unClient());

    expect(result.current.saisie).toStrictEqual(uneSaisieDeDiagnostic());
    expect(result.current.sauvegarde).toStrictEqual({ etat: 'enregistre', version: 1 });
  });

  it('explique un chargement impossible', async () => {
    const { result } = renderHook(() =>
      useEntretien(
        unClient(() => Promise.resolve({ ok: false, error: { kind: 'Injoignable' } })),
        'd',
      ),
    );

    await waitFor(() => {
      expect(result.current.chargement).toMatchObject({ etat: 'erreur' });
    });
  });

  it('enregistre une modification valide comme version suivante', async () => {
    const client = unClient();
    const { result } = await monter(client);
    const modifiee = { ...uneSaisieDeDiagnostic(), processus: [] };

    act(() => {
      result.current.modifier(modifiee);
    });
    expect(result.current.sauvegarde).toStrictEqual({ etat: 'en-attente' });

    await waitFor(() => {
      expect(result.current.sauvegarde).toStrictEqual({ etat: 'enregistre', version: 2 });
    });
    expect(client.reviserUnDiagnostic).toHaveBeenCalledWith('d', 1, {
      prospect: modifiee.prospect,
      hypotheses: modifiee.hypotheses,
      processus: [],
    });
  });

  it('regroupe les frappes rapprochées en un seul enregistrement, avec la dernière saisie', async () => {
    const client = unClient();
    const { result } = await monter(client);

    act(() => {
      result.current.modifier({ ...uneSaisieDeDiagnostic(), prospect: { nom: 'D' } });
      result.current.modifier({ ...uneSaisieDeDiagnostic(), prospect: { nom: 'Du' } });
      result.current.modifier({ ...uneSaisieDeDiagnostic(), prospect: { nom: 'Durand' } });
    });

    await waitFor(() => {
      expect(result.current.sauvegarde).toMatchObject({ etat: 'enregistre', version: 2 });
    });
    expect(client.reviserUnDiagnostic).toHaveBeenCalledTimes(1);
    expect(vi.mocked(client.reviserUnDiagnostic).mock.calls[0]?.[2].prospect).toStrictEqual({
      nom: 'Durand',
    });
  });

  it('enchaîne les enregistrements avec la dernière version connue', async () => {
    const client = unClient();
    const { result } = await monter(client);

    act(() => {
      result.current.modifier({ ...uneSaisieDeDiagnostic(), prospect: { nom: 'Un' } });
    });
    await waitFor(() => {
      expect(result.current.sauvegarde).toMatchObject({ version: 2 });
    });
    act(() => {
      result.current.modifier({ ...uneSaisieDeDiagnostic(), prospect: { nom: 'Deux' } });
    });
    await waitFor(() => {
      expect(result.current.sauvegarde).toMatchObject({ version: 3 });
    });

    expect(vi.mocked(client.reviserUnDiagnostic).mock.calls.map((appel) => appel[1])).toStrictEqual(
      [1, 2],
    );
  });

  it('n’envoie pas une saisie que le domaine refuse, et désigne le champ à compléter', async () => {
    const client = unClient();
    const { result } = await monter(client);

    act(() => {
      result.current.modifier({
        ...uneSaisieDeDiagnostic(),
        processus: [uneSaisieDeProcessus({ personnes: 0 })],
      });
    });

    expect(result.current.sauvegarde).toMatchObject({
      etat: 'a-completer',
      erreur: { champ: 'processus[0].personnes' },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(client.reviserUnDiagnostic).not.toHaveBeenCalled();
  });

  it('signale une révision concurrente avec la version actuelle, puis recharge', async () => {
    let versionServeur = 1;
    const client = unClient(
      () => Promise.resolve({ ok: true, value: publie(versionServeur) }),
      vi.fn(() => Promise.resolve({ ok: false as const, error: conflit })),
    );
    const { result } = await monter(client);

    act(() => {
      result.current.modifier({ ...uneSaisieDeDiagnostic(), prospect: { nom: 'Concurrent' } });
    });
    await waitFor(() => {
      expect(result.current.sauvegarde).toStrictEqual({ etat: 'conflit', versionActuelle: 5 });
    });

    versionServeur = 5;
    await act(async () => {
      await result.current.recharger();
    });

    expect(result.current.sauvegarde).toStrictEqual({ etat: 'enregistre', version: 5 });
    expect(result.current.saisie?.prospect.nom).toBe('Négoce Durand');
  });

  it('explique un enregistrement impossible', async () => {
    const { result } = await monter(
      unClient(
        undefined,
        vi.fn(() =>
          Promise.resolve({ ok: false as const, error: { kind: 'Injoignable' as const } }),
        ),
      ),
    );

    act(() => {
      result.current.modifier({ ...uneSaisieDeDiagnostic(), prospect: { nom: 'Hors ligne' } });
    });

    await waitFor(() => {
      expect(result.current.sauvegarde.etat).toBe('echec');
    });
    expect(JSON.stringify(result.current.sauvegarde)).toContain('ne répond pas');
  });

  it('n’annonce pas « enregistré » quand l’utilisateur a continué à taper pendant l’envoi', async () => {
    let repondre: (reponse: Reponse) => void = () => undefined;
    const reviser = vi
      .fn<ClientDeLApi['reviserUnDiagnostic']>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            repondre = resolve;
          }),
      )
      .mockImplementation((_id, versionAttendue, modifications) =>
        Promise.resolve({
          ok: true as const,
          value: publie(versionAttendue + 1, { ...modifications, dateDEntretien: '2026-10-27' }),
        }),
      );
    const { result } = await monter(unClient(undefined, reviser));

    act(() => {
      result.current.modifier({ ...uneSaisieDeDiagnostic(), prospect: { nom: 'Premier envoi' } });
    });
    await waitFor(() => {
      expect(result.current.sauvegarde).toStrictEqual({ etat: 'enregistrement' });
    });
    act(() => {
      result.current.modifier({
        ...uneSaisieDeDiagnostic(),
        prospect: { nom: 'Tapé pendant l’envoi' },
      });
    });
    await act(async () => {
      repondre({ ok: true, value: publie(2) });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.sauvegarde).toStrictEqual({ etat: 'enregistre', version: 3 });
    });
    expect(reviser.mock.calls.map((appel) => appel[2].prospect.nom)).toStrictEqual([
      'Premier envoi',
      'Tapé pendant l’envoi',
    ]);
  });

  it('explique un enregistrement refusé par le serveur', async () => {
    const refus: ErreurDApi = {
      kind: 'Probleme',
      probleme: {
        type: '/problemes/saisie-invalide',
        title: 'Saisie invalide',
        status: 422,
        detail: 'Refusé.',
      },
    };
    const { result } = await monter(
      unClient(
        undefined,
        vi.fn(() => Promise.resolve({ ok: false as const, error: refus })),
      ),
    );

    act(() => {
      result.current.modifier({ ...uneSaisieDeDiagnostic(), prospect: { nom: 'Refusé' } });
    });

    await waitFor(() => {
      expect(result.current.sauvegarde).toStrictEqual({ etat: 'echec', message: 'Refusé.' });
    });
  });

  it('demande confirmation avant de quitter la page avec des modifications non enregistrées', async () => {
    const { result, unmount } = await monter(
      unClient(
        undefined,
        vi.fn(() => new Promise<never>(() => undefined)),
      ),
    );
    const quitterSansRien = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(quitterSansRien);
    expect(quitterSansRien.defaultPrevented).toBe(false);

    act(() => {
      result.current.modifier({
        ...uneSaisieDeDiagnostic(),
        prospect: { nom: 'Pas encore enregistré' },
      });
    });
    const quitter = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(quitter);

    expect(quitter.defaultPrevented).toBe(true);
    unmount();
  });
});
