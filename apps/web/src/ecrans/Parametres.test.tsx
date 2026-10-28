import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { FournisseurDeRaccourcis } from '../raccourcis/ContexteDesRaccourcis.js';
import { Parametres } from './Parametres.js';

const afficher = (stockage: Storage | undefined) => {
  render(
    <FournisseurDeRaccourcis stockage={stockage}>
      <Parametres />
    </FournisseurDeRaccourcis>,
  );
};

const ligne = (action: string) => {
  const cellule = screen.getByRole('rowheader', { name: action });
  const rangee = cellule.closest('tr');
  if (rangee === null) throw new Error(`ligne absente : ${action}`);
  return within(rangee);
};

describe('Paramètres', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('affiche chaque action avec son raccourci actuel', () => {
    afficher(window.localStorage);

    expect(ligne('Nouveau processus').getByText('Alt+N')).toBeInTheDocument();
    expect(ligne('Section suivante du formulaire').getByText('Ctrl+Entrée')).toBeInTheDocument();
  });

  it('remplace un raccourci par la combinaison tapée', async () => {
    afficher(window.localStorage);

    await userEvent.click(ligne('Nouveau processus').getByRole('button', { name: 'Modifier' }));
    expect(screen.getByRole('status')).toHaveTextContent('Tapez la nouvelle combinaison');
    await userEvent.keyboard('{Control>}{Shift>}p{/Shift}{/Control}');

    expect(ligne('Nouveau processus').getByText('Ctrl+Maj+P')).toBeInTheDocument();
    expect(window.localStorage.getItem('slideshow.raccourcis')).toContain('"touche":"p"');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('annule la modification avec Échap', async () => {
    afficher(window.localStorage);

    await userEvent.click(ligne('Nouveau processus').getByRole('button', { name: 'Modifier' }));
    await userEvent.keyboard('{Escape}');

    expect(ligne('Nouveau processus').getByText('Alt+N')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('attend la touche quand seul un modificateur est enfoncé', async () => {
    afficher(window.localStorage);

    await userEvent.click(ligne('Processus suivant').getByRole('button', { name: 'Modifier' }));
    await userEvent.keyboard('{Alt}');

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('signale deux actions qui partagent une combinaison', async () => {
    afficher(window.localStorage);

    await userEvent.click(ligne('Processus suivant').getByRole('button', { name: 'Modifier' }));
    await userEvent.keyboard('{Alt>}n{/Alt}');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nouveau processus et Processus suivant utilisent la même combinaison (Alt+N).',
    );
  });

  it('rétablit les valeurs par défaut', async () => {
    afficher(window.localStorage);
    await userEvent.click(ligne('Nouveau processus').getByRole('button', { name: 'Modifier' }));
    await userEvent.keyboard('{F2}');

    await userEvent.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));

    expect(ligne('Nouveau processus').getByText('Alt+N')).toBeInTheDocument();
  });

  it('prévient quand le navigateur refuse de retenir les modifications', async () => {
    afficher(undefined);

    await userEvent.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));

    expect(screen.getByText(/ne seront pas retenues/)).toBeInTheDocument();
  });
});
