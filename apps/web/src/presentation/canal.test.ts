import { describe, expect, it, vi } from 'vitest';
import { ouvrirLeCanal } from './canal.js';

const attendre = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('canal de présentation', () => {
  it('transmet les messages d’une fenêtre à l’autre pour le même diagnostic', async () => {
    const ecran = ouvrirLeCanal('d');
    const presentateur = ouvrirLeCanal('d');
    const recu = vi.fn();
    const arreter = presentateur.ecouter(recu);

    ecran.envoyer({ type: 'page', numero: 3 });
    await attendre();

    expect(recu).toHaveBeenCalledWith({ type: 'page', numero: 3 });
    arreter();
    ecran.envoyer({ type: 'page', numero: 4 });
    await attendre();
    expect(recu).toHaveBeenCalledTimes(1);
    ecran.fermer();
    presentateur.fermer();
  });

  it('isole les diagnostics', async () => {
    const autre = ouvrirLeCanal('autre');
    const presentateur = ouvrirLeCanal('d');
    const recu = vi.fn();
    presentateur.ecouter(recu);

    autre.envoyer({ type: 'aller', numero: 1 });
    await attendre();

    expect(recu).not.toHaveBeenCalled();
    autre.fermer();
    presentateur.fermer();
  });

  it('ignore un message mal formé', async () => {
    const intrus = new BroadcastChannel('slideshow.presentation.d');
    const presentateur = ouvrirLeCanal('d');
    const recu = vi.fn();
    presentateur.ecouter(recu);

    intrus.postMessage({ type: 'page', numero: -1 });
    intrus.postMessage('n’importe quoi');
    await attendre();

    expect(recu).not.toHaveBeenCalled();
    intrus.close();
    presentateur.fermer();
  });
});
