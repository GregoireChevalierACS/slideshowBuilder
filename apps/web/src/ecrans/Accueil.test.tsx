import { uneSaisieDeDiagnostic } from '@slideshow/application/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ClientDeLApi } from '../api/clientDeLApi.js';
import { FournisseurDeRaccourcis } from '../raccourcis/ContexteDesRaccourcis.js';
import { Accueil } from './Accueil.js';

const unClient = (surcharges: Partial<ClientDeLApi> = {}): ClientDeLApi => ({
  listerLesDiagnostics: vi.fn(() =>
    Promise.resolve({
      ok: true as const,
      value: [
        { id: 'b', prospect: 'Négoce Durand', dateDEntretien: '2026-10-28', derniereVersion: 3 },
        { id: 'a', prospect: 'Cabinet Martin', dateDEntretien: '2026-10-20', derniereVersion: 1 },
      ],
    }),
  ),
  ouvrirUnDiagnostic: vi.fn(() =>
    Promise.resolve({
      ok: true as const,
      value: { id: 'nouveau', version: 1, saisie: uneSaisieDeDiagnostic() },
    }),
  ),
  consulterUnDiagnostic: vi.fn(),
  reviserUnDiagnostic: vi.fn(),
  ...surcharges,
});

const afficher = (client: ClientDeLApi, ouvrir = vi.fn()) => {
  render(
    <FournisseurDeRaccourcis stockage={undefined}>
      <Accueil client={client} ouvrir={ouvrir} />
    </FournisseurDeRaccourcis>,
  );
  return ouvrir;
};

describe('Accueil', () => {
  it('liste les diagnostics, avec un lien vers chacun', async () => {
    afficher(unClient());

    const lien = await screen.findByRole('link', { name: /Négoce Durand/ });
    expect(lien).toHaveAttribute('href', '#/diagnostics/b');
    expect(lien).toHaveTextContent('28 octobre 2026');
    expect(lien).toHaveTextContent('version 3');
    expect(screen.getByRole('link', { name: /Cabinet Martin/ })).toBeInTheDocument();
  });

  it('affiche telle quelle une date qu’il ne sait pas lire', async () => {
    afficher(
      unClient({
        listerLesDiagnostics: vi.fn(() =>
          Promise.resolve({
            ok: true as const,
            value: [
              { id: 'a', prospect: 'Ancien', dateDEntretien: 'inconnue', derniereVersion: 1 },
            ],
          }),
        ),
      }),
    );

    expect(await screen.findByRole('link', { name: /Ancien/ })).toHaveTextContent('inconnue');
  });

  it('invite à commencer quand il n’y a encore aucun diagnostic', async () => {
    afficher(
      unClient({
        listerLesDiagnostics: vi.fn(() => Promise.resolve({ ok: true as const, value: [] })),
      }),
    );

    expect(await screen.findByText(/Aucun diagnostic pour l’instant/)).toBeInTheDocument();
  });

  it('explique pourquoi la liste n’a pas pu être chargée', async () => {
    afficher(
      unClient({
        listerLesDiagnostics: vi.fn(() =>
          Promise.resolve({ ok: false as const, error: { kind: 'Injoignable' as const } }),
        ),
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Le serveur ne répond pas');
  });

  it('ouvre un diagnostic au clavier : N, le prospect, puis Entrée', async () => {
    const client = unClient();
    const ouvrir = afficher(client);
    await screen.findByRole('link', { name: /Négoce Durand/ });

    await userEvent.keyboard('n');
    expect(screen.getByLabelText('Nom du prospect')).toHaveFocus();
    await userEvent.keyboard('Durand SAS');
    await userEvent.tab();
    await userEvent.keyboard('Négoce');
    await userEvent.tab();
    await userEvent.keyboard('25{Enter}');

    expect(client.ouvrirUnDiagnostic).toHaveBeenCalledWith({
      nom: 'Durand SAS',
      secteur: 'Négoce',
      effectifTotal: 25,
    });
    expect(ouvrir).toHaveBeenCalledWith('nouveau');
  });

  it('n’envoie ni secteur ni effectif laissés vides', async () => {
    const client = unClient();
    afficher(client);

    await userEvent.click(screen.getByRole('button', { name: /Nouveau diagnostic/ }));
    await userEvent.keyboard('Cabinet Martin{Enter}');

    expect(client.ouvrirUnDiagnostic).toHaveBeenCalledWith({ nom: 'Cabinet Martin' });
  });

  it('affiche le refus du serveur sans quitter le formulaire', async () => {
    const ouvrir = afficher(
      unClient({
        ouvrirUnDiagnostic: vi.fn(() =>
          Promise.resolve({
            ok: false as const,
            error: {
              kind: 'Probleme' as const,
              probleme: {
                type: '/problemes/saisie-invalide',
                title: 'Saisie invalide',
                status: 422,
                detail: 'Le champ « prospect.nom » est refusé : NomDeProspectVide.',
              },
            },
          }),
        ),
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: /Nouveau diagnostic/ }));
    await userEvent.keyboard('   {Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('NomDeProspectVide');
    expect(screen.getByLabelText('Nom du prospect')).toBeInTheDocument();
    expect(ouvrir).not.toHaveBeenCalled();
  });

  it('referme le formulaire avec Échap', async () => {
    afficher(unClient());

    await userEvent.click(screen.getByRole('button', { name: /Nouveau diagnostic/ }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByLabelText('Nom du prospect')).not.toBeInTheDocument();
  });
});
