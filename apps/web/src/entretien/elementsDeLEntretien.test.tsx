import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IndicateurDeSauvegarde } from './elementsDeLEntretien.js';

describe('IndicateurDeSauvegarde', () => {
  it('signale un conflit même quand le serveur ne donne pas la version actuelle', () => {
    render(
      <IndicateurDeSauvegarde
        sauvegarde={{ etat: 'conflit', versionActuelle: undefined }}
        recharger={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ce diagnostic a été modifié ailleurs. Vos',
    );
  });

  it('montre qu’un enregistrement est en cours', () => {
    render(<IndicateurDeSauvegarde sauvegarde={{ etat: 'enregistrement' }} recharger={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Enregistrement…');
  });
});
