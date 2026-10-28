import { uneSaisieDeDiagnostic } from '@slideshow/application/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientDeLApi } from './api/clientDeLApi.js';
import { App } from './App.js';

const unClient = (consulter: ClientDeLApi['consulterUnDiagnostic'] = vi.fn()): ClientDeLApi => ({
  listerLesDiagnostics: vi.fn(() => Promise.resolve({ ok: true as const, value: [] })),
  ouvrirUnDiagnostic: vi.fn(() =>
    Promise.resolve({
      ok: true as const,
      value: { id: 'nouveau', version: 1, saisie: uneSaisieDeDiagnostic() },
    }),
  ),
  consulterUnDiagnostic: consulter,
  reviserUnDiagnostic: vi.fn(),
});

const diagnostic = () =>
  vi.fn<ClientDeLApi['consulterUnDiagnostic']>(() =>
    Promise.resolve({
      ok: true as const,
      value: { id: 'nouveau', version: 4, saisie: uneSaisieDeDiagnostic() },
    }),
  );

describe('App', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('montre l’accueil par défaut, puis les paramètres', async () => {
    render(<App client={unClient()} stockage={undefined} />);
    expect(
      await screen.findByRole('heading', { name: 'Diagnostics d’automatisation' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: 'Paramètres' }));

    expect(await screen.findByRole('heading', { name: 'Paramètres' })).toBeInTheDocument();
  });

  it('mène à l’entretien du diagnostic qui vient d’être ouvert', async () => {
    const consulter = diagnostic();
    render(<App client={unClient(consulter)} stockage={undefined} />);

    await userEvent.click(await screen.findByRole('button', { name: /Nouveau diagnostic/ }));
    await userEvent.keyboard('Négoce Durand{Enter}');

    expect(
      await screen.findByRole('heading', { name: /Négoce Durand · version 4/ }),
    ).toBeInTheDocument();
    expect(consulter).toHaveBeenCalledWith('nouveau');
  });

  it('explique pourquoi un diagnostic n’a pas pu être chargé', async () => {
    window.location.hash = '#/diagnostics/inconnu';
    render(
      <App
        client={unClient(
          vi.fn(() =>
            Promise.resolve({
              ok: false as const,
              error: {
                kind: 'Probleme' as const,
                probleme: {
                  type: '/problemes/diagnostic-introuvable',
                  title: 'Diagnostic introuvable',
                  status: 404,
                  detail: 'Aucun diagnostic « inconnu ».',
                },
              },
            }),
          ),
        )}
        stockage={undefined}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Aucun diagnostic « inconnu ».');
  });
});
