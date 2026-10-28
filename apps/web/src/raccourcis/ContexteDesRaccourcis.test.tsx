import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FournisseurDeRaccourcis, useRaccourci, useRaccourcis } from './ContexteDesRaccourcis.js';
import { RACCOURCIS_PAR_DEFAUT } from './raccourcis.js';

const Ecoute = ({
  surNouveau,
  surProcessus,
}: {
  surNouveau: () => void;
  surProcessus: () => void;
}) => {
  useRaccourci('nouveauDiagnostic', surNouveau);
  useRaccourci('nouveauProcessus', surProcessus);
  const { raccourcis, enregistres, modifier } = useRaccourcis();
  return (
    <>
      <input aria-label="Nom" />
      <p>{enregistres ? 'enregistrés' : 'non enregistrés'}</p>
      <p>{raccourcis.nouveauDiagnostic.touche}</p>
      <button
        type="button"
        onClick={() => {
          modifier({
            ...raccourcis,
            nouveauDiagnostic: { ...raccourcis.nouveauDiagnostic, touche: 'd' },
          });
        }}
      >
        Changer
      </button>
    </>
  );
};

const monter = (stockage: Storage | undefined) => {
  const surNouveau = vi.fn();
  const surProcessus = vi.fn();
  render(
    <FournisseurDeRaccourcis stockage={stockage}>
      <Ecoute surNouveau={surNouveau} surProcessus={surProcessus} />
    </FournisseurDeRaccourcis>,
  );
  return { surNouveau, surProcessus };
};

describe('raccourcis dans l’interface', () => {
  it('déclenche l’action de la touche configurée', async () => {
    window.localStorage.clear();
    const { surNouveau } = monter(window.localStorage);

    await userEvent.keyboard('n');

    expect(surNouveau).toHaveBeenCalledTimes(1);
  });

  it('ignore un raccourci sans modificateur tapé dans un champ de saisie', async () => {
    window.localStorage.clear();
    const { surNouveau } = monter(window.localStorage);

    await userEvent.type(screen.getByLabelText('Nom'), 'n');

    expect(surNouveau).not.toHaveBeenCalled();
  });

  it('déclenche un raccourci avec Alt même depuis un champ de saisie', async () => {
    window.localStorage.clear();
    const { surProcessus } = monter(window.localStorage);

    await userEvent.type(screen.getByLabelText('Nom'), '{Alt>}n{/Alt}');

    expect(surProcessus).toHaveBeenCalledTimes(1);
  });

  it('applique et retient une modification', async () => {
    window.localStorage.clear();
    const { surNouveau } = monter(window.localStorage);

    await userEvent.click(screen.getByRole('button', { name: 'Changer' }));
    await userEvent.keyboard('n');
    await userEvent.keyboard('d');

    expect(surNouveau).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('slideshow.raccourcis')).toContain('"touche":"d"');
    expect(screen.getByText('enregistrés')).toBeInTheDocument();
  });

  it('signale une modification que le navigateur n’a pas pu enregistrer', async () => {
    monter(undefined);

    await userEvent.click(screen.getByRole('button', { name: 'Changer' }));

    expect(screen.getByText('non enregistrés')).toBeInTheDocument();
  });

  it('fournit les valeurs par défaut hors de tout fournisseur', () => {
    const Lecture = () => {
      const { raccourcis, modifier } = useRaccourcis();
      modifier(raccourcis);
      return <p>{raccourcis === RACCOURCIS_PAR_DEFAUT ? 'par défaut' : 'autres'}</p>;
    };
    render(<Lecture />);

    expect(screen.getByText('par défaut')).toBeInTheDocument();
  });
});
