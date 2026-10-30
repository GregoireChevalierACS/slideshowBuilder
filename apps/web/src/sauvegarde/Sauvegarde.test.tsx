import { err, ok } from '@slideshow/domain';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ClientDeLApi, CompteRenduDImport } from '../api/clientDeLApi.js';
import { devenirDuDiagnostic, Sauvegarde } from './Sauvegarde.js';

const unClient = (importer: ClientDeLApi['importerDesDiagnostics']): ClientDeLApi => ({
  listerLesDiagnostics: vi.fn(),
  ouvrirUnDiagnostic: vi.fn(),
  consulterUnDiagnostic: vi.fn(),
  reviserUnDiagnostic: vi.fn(),
  importerDesDiagnostics: importer,
});

const reussi = (compteRendu: CompteRenduDImport) =>
  vi.fn<ClientDeLApi['importerDesDiagnostics']>(() => Promise.resolve(ok(compteRendu)));

const afficher = (client: ClientDeLApi, apresImport = vi.fn()) => {
  render(<Sauvegarde client={client} apresImport={apresImport} />);
  return apresImport;
};

const unFichier = (contenu = '{"format":"slideshow-builder/diagnostics"}') =>
  new File([contenu], 'diagnostics.json', { type: 'application/json' });

const choisir = async (fichier = unFichier()) => {
  await userEvent.upload(screen.getByLabelText('Importer un export…'), fichier);
};

describe('Sauvegarde', () => {
  it('propose de tout exporter dans un fichier', () => {
    afficher(unClient(vi.fn()));

    const lien = screen.getByRole('link', { name: 'Tout exporter' });
    expect(lien).toHaveAttribute('href', '/api/export');
    expect(lien).toHaveAttribute('download');
  });

  it('envoie le contenu du fichier choisi, rend compte de chaque diagnostic et recharge la liste', async () => {
    const importer = reussi([
      { id: 'a', prospect: 'Négoce Durand', statut: 'importe', versionsAjoutees: 3 },
      { id: 'b', prospect: 'Cabinet Martin', statut: 'aJour', versionsAjoutees: 0 },
    ]);
    const apresImport = afficher(unClient(importer));

    await choisir(unFichier('{"contenu":"du fichier"}'));

    const compteRendu = await screen.findByRole('status');
    expect(importer).toHaveBeenCalledWith('{"contenu":"du fichier"}');
    expect(compteRendu).toHaveTextContent('Négoce Durand : importé (3 versions)');
    expect(compteRendu).toHaveTextContent('Cabinet Martin : déjà à jour sur ce poste');
    expect(apresImport).toHaveBeenCalledOnce();
  });

  it('signale un fichier sans diagnostic', async () => {
    afficher(unClient(reussi([])));

    await choisir();

    expect(await screen.findByRole('status')).toHaveTextContent('aucun diagnostic');
  });

  it('explique un fichier refusé, sans recharger la liste', async () => {
    const refus = vi.fn<ClientDeLApi['importerDesDiagnostics']>(() =>
      Promise.resolve(
        err({
          kind: 'Probleme' as const,
          probleme: {
            type: '/problemes/export-illisible',
            title: 'Export illisible',
            status: 422,
            detail: 'Ce fichier n’est pas un export de diagnostics. Rien n’a été importé.',
          },
        }),
      ),
    );
    const apresImport = afficher(unClient(refus));

    await choisir();

    expect(await screen.findByRole('alert')).toHaveTextContent('Rien n’a été importé.');
    expect(apresImport).not.toHaveBeenCalled();
  });

  it('ne fait rien quand aucun fichier n’est choisi', () => {
    const importer = vi.fn<ClientDeLApi['importerDesDiagnostics']>();
    afficher(unClient(importer));

    fireEvent.change(screen.getByLabelText('Importer un export…'), { target: { files: [] } });
    fireEvent.change(screen.getByLabelText('Importer un export…'), { target: { files: null } });

    expect(importer).not.toHaveBeenCalled();
  });

  it.each([
    ['importe', 1, 'importé (1 version)'],
    ['complete', 2, 'complété (2 versions de plus)'],
    ['aJour', 0, 'déjà à jour sur ce poste'],
    ['divergent', 0, 'non importé : il a été modifié ici aussi, son historique diffère'],
    ['divergent', 1, 'interrompu : modifié ici pendant l’import, après 1 version ajoutée'],
    ['divergent', 2, 'interrompu : modifié ici pendant l’import, après 2 versions ajoutées'],
  ] as const)('dit ce qu’est devenu un diagnostic %s (%i)', (statut, versionsAjoutees, texte) => {
    expect(devenirDuDiagnostic({ id: 'a', prospect: 'P', statut, versionsAjoutees })).toBe(texte);
  });
});
