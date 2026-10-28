import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChampDeChoix, ChampNumerique, ChampTexte, lireUnNombre, Section } from './champs.js';

describe('lireUnNombre', () => {
  it.each([
    ['2,5', 2.5],
    [' 12 ', 12],
    ['3.25', 3.25],
  ])('lit « %s » comme %s', (texte, attendu) => {
    expect(lireUnNombre(texte)).toBe(attendu);
  });

  it.each(['', '  ', 'deux', '1,2,3'])('ne sait pas lire « %s »', (texte) => {
    expect(lireUnNombre(texte)).toBeNaN();
  });
});

describe('ChampNumerique', () => {
  const Controle = ({
    initiale,
    surChangement,
  }: {
    initiale: number;
    surChangement: (v: number) => void;
  }) => {
    const [valeur, setValeur] = useState(initiale);
    return (
      <>
        <ChampNumerique
          libelle="Durée"
          unite="min"
          valeur={valeur}
          modifier={(v) => {
            setValeur(v);
            surChangement(v);
          }}
        />
        <button
          type="button"
          onClick={() => {
            setValeur(15);
          }}
        >
          Appliquer un modèle
        </button>
      </>
    );
  };

  it('affiche la valeur avec une virgule décimale et son unité', () => {
    render(<Controle initiale={2.5} surChangement={vi.fn()} />);

    expect(screen.getByLabelText('Durée')).toHaveValue('2,5');
    expect(screen.getByText('min')).toBeInTheDocument();
  });

  it('garde le texte en cours de frappe et transmet chaque valeur lue', async () => {
    const surChangement = vi.fn();
    render(<Controle initiale={5} surChangement={surChangement} />);
    const champ = screen.getByLabelText('Durée');

    await userEvent.clear(champ);
    await userEvent.type(champ, '2,');

    expect(champ).toHaveValue('2,');
    expect(surChangement).toHaveBeenLastCalledWith(2);
  });

  it('transmet NaN pour un texte illisible, sans effacer ce qui est tapé', async () => {
    const surChangement = vi.fn();
    render(<Controle initiale={5} surChangement={surChangement} />);
    const champ = screen.getByLabelText('Durée');

    await userEvent.clear(champ);
    await userEvent.type(champ, 'abc');

    expect(champ).toHaveValue('abc');
    expect(surChangement).toHaveBeenLastCalledWith(Number.NaN);
  });

  it('se met à jour quand la valeur change ailleurs', async () => {
    render(<Controle initiale={5} surChangement={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Appliquer un modèle' }));

    expect(screen.getByLabelText('Durée')).toHaveValue('15');
  });

  it('affiche une valeur absente comme un champ vide, et son erreur', () => {
    render(
      <ChampNumerique
        libelle="Personnes"
        valeur={Number.NaN}
        modifier={vi.fn()}
        erreur="Au moins une personne."
      />,
    );

    const champ = screen.getByLabelText('Personnes');
    expect(champ).toHaveValue('');
    expect(champ).toHaveAttribute('aria-invalid', 'true');
    expect(champ).toHaveAccessibleDescription('Au moins une personne.');
  });
});

describe('ChampTexte', () => {
  it('propose des suggestions et signale son erreur', async () => {
    const modifier = vi.fn();
    render(
      <ChampTexte
        libelle="Outil"
        valeur=""
        modifier={modifier}
        suggestions={['Outlook', 'Pennylane']}
        erreur="À renseigner."
      />,
    );
    const champ = screen.getByLabelText('Outil');

    await userEvent.type(champ, 'O');

    expect(modifier).toHaveBeenCalledWith('O');
    expect(champ).toHaveAccessibleDescription('À renseigner.');
    expect(document.querySelectorAll('datalist option')).toHaveLength(2);
  });

  it('fonctionne sans suggestions ni erreur', () => {
    render(<ChampTexte libelle="Nom" valeur="Relances" modifier={vi.fn()} />);

    expect(screen.getByLabelText('Nom')).toHaveValue('Relances');
    expect(screen.getByLabelText('Nom')).not.toHaveAttribute('list');
  });
});

describe('ChampDeChoix et Section', () => {
  it('transmet le choix fait dans une section nommée', async () => {
    const modifier = vi.fn();
    render(
      <Section titre="Comment">
        <ChampDeChoix
          libelle="Données"
          valeur="structurees"
          modifier={modifier}
          choix={[
            ['structurees', 'Structurées'],
            ['documents', 'Documents (PDF, scans)'],
          ]}
        />
      </Section>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Données'), 'Documents (PDF, scans)');

    expect(modifier).toHaveBeenCalledWith('documents');
    expect(screen.getByRole('group', { name: 'Comment' })).toBeInTheDocument();
  });
});
