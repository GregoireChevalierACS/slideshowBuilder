import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '@slideshow/application/testing';
import { err, ok } from '@slideshow/domain';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientDeLApi } from '../api/clientDeLApi.js';
import type { ReglagesDePresentation } from '../navigation.js';
import { unBusEnMemoire } from '../presentation/testing/canalEnMemoire.js';
import { Presentateur } from './Presentateur.js';
import { Presentation } from './Presentation.js';

const avecAlerte = () =>
  uneSaisieDeDiagnostic({
    processus: [
      uneSaisieDeProcessus({
        nom: 'Tri du courrier',
        dureeUnitaireEnSecondes: 8 * 3_600,
        frequence: { nombre: 1, periode: 'jour' },
      }),
    ],
  });

const unClient = (consulter?: ClientDeLApi['consulterUnDiagnostic']): ClientDeLApi => ({
  listerLesDiagnostics: vi.fn(),
  ouvrirUnDiagnostic: vi.fn(),
  reviserUnDiagnostic: vi.fn(),
  consulterUnDiagnostic:
    consulter ??
    vi.fn((_id: string, version?: number) =>
      Promise.resolve(
        ok({
          id: 'd',
          version: version ?? 3,
          saisie: version === 1 ? uneSaisieDeDiagnostic() : avecAlerte(),
        }),
      ),
    ),
});

const courte: ReglagesDePresentation = { public: 'dirigeant', duree: 'courte' };

const lancer = async (bus = unBusEnMemoire(), reglages = courte, client = unClient()) => {
  render(<Presentation client={client} id="d" reglages={reglages} ouvrirCanal={bus.ouvrir} />);
  await screen.findByRole('heading', { name: 'Présenter : Négoce Durand' });
  return bus;
};

// Une région masquée n'a pas de nom accessible : on la retrouve par sa classe.
const diffusion = () => {
  const scene = document.querySelector<HTMLElement>('.scene');
  if (scene === null) throw new Error('scène de diffusion absente');
  return scene;
};
const titreDiffuse = () =>
  within(diffusion()).queryByRole('heading', { level: 2 })?.textContent ??
  within(diffusion()).getByRole('heading', { level: 1 }).textContent;

describe('Présentation', () => {
  afterEach(() => {
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  it('montre un aperçu de chaque diapositive et les réglages actuels', async () => {
    await lancer();

    expect(
      within(screen.getByRole('list', { name: 'Aperçu des diapositives' })).getAllByRole('button'),
    ).toHaveLength(5);
    expect(screen.getByLabelText('Public')).toHaveValue('dirigeant');
    expect(screen.getByLabelText('Durée')).toHaveValue('courte');
    expect(screen.getByLabelText('Version')).toHaveValue('3');
    expect(screen.getByRole('button', { name: 'Présenter en plein écran' })).toHaveFocus();
  });

  it('change de réglages par l’URL : public, durée, version', async () => {
    await lancer();

    await userEvent.selectOptions(screen.getByLabelText('Public'), 'Technique');
    expect(window.location.hash).toBe('#/diagnostics/d/presentation?public=technique&duree=courte');
    await userEvent.selectOptions(screen.getByLabelText('Durée'), 'Complète (environ 15 min)');
    expect(window.location.hash).toContain('duree=complete');
    await userEvent.selectOptions(screen.getByLabelText('Version'), '1');
    expect(window.location.hash).toContain('version=1');
  });

  it('présente au clavier : suivante, précédente, début, fin, Échap', async () => {
    await lancer();

    await userEvent.keyboard('{Enter}');
    expect(diffusion()).toBeVisible();
    expect(within(diffusion()).getByText('1 / 5')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(titreDiffuse()).toBe('Le coût caché');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{PageDown}');
    expect(within(diffusion()).getByText('4 / 5')).toBeInTheDocument();
    await userEvent.keyboard('{End}{ArrowRight}');
    expect(within(diffusion()).getByText('5 / 5')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}{PageUp}');
    expect(within(diffusion()).getByText('3 / 5')).toBeInTheDocument();
    await userEvent.keyboard('{Home}{ArrowLeft}');
    expect(within(diffusion()).getByText('1 / 5')).toBeInTheDocument();
    await userEvent.keyboard('a');
    await userEvent.keyboard('{Escape}');
    expect(diffusion()).not.toBeVisible();
  });

  it('demande le plein écran, et s’arrête quand on en sort', async () => {
    const pleinEcran = vi.fn(() => Promise.resolve());
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: pleinEcran,
      configurable: true,
    });
    await lancer();

    await userEvent.click(
      screen.getByRole('button', { name: 'Présenter à partir de la diapositive 3' }),
    );
    expect(pleinEcran).toHaveBeenCalled();
    expect(within(diffusion()).getByText('3 / 5')).toBeInTheDocument();
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.body,
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(diffusion()).toBeVisible();
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(diffusion()).not.toBeVisible();
    Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
  });

  it('diffuse quand même si le navigateur refuse le plein écran', async () => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn(() => Promise.reject(new Error('refusé'))),
      configurable: true,
    });
    await lancer();

    await userEvent.keyboard('{Enter}');

    expect(diffusion()).toBeVisible();
    Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
  });

  it('exporte en PDF par l’impression du navigateur, une page par diapositive', async () => {
    const imprimer = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    await lancer();

    await userEvent.click(screen.getByRole('button', { name: 'Exporter en PDF' }));

    expect(imprimer).toHaveBeenCalled();
    expect(document.querySelectorAll('.impression .diapositive')).toHaveLength(5);
  });

  it('ouvre la vue présentateur sur la même version', async () => {
    const ouvrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    await lancer();

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir la vue présentateur' }));

    expect(ouvrir).toHaveBeenCalledWith(
      '#/diagnostics/d/presentateur?public=dirigeant&duree=courte&version=3',
      'slideshow-presentateur',
      'popup',
    );
  });

  it('annonce chaque page à la vue présentateur, et obéit à ses demandes', async () => {
    const bus = await lancer();
    await userEvent.keyboard('{Enter}{ArrowRight}');
    expect(bus.envoyes).toContainEqual({ type: 'page', numero: 1 });

    act(() => {
      bus.diffuser('d', { type: 'aller', numero: 3 });
    });
    expect(within(diffusion()).getByText('4 / 5')).toBeInTheDocument();
    act(() => {
      bus.diffuser('d', { type: 'demande' });
    });
    expect(bus.envoyes.at(-1)).toStrictEqual({ type: 'page', numero: 3 });
  });

  it('explique un diagnostic impossible à présenter', async () => {
    render(
      <Presentation
        client={unClient(vi.fn(() => Promise.resolve(err({ kind: 'Injoignable' as const }))))}
        id="d"
        reglages={courte}
        ouvrirCanal={unBusEnMemoire().ouvrir}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('ne répond pas');
    expect(screen.getByRole('link', { name: '← Retour à l’entretien' })).toHaveAttribute(
      'href',
      '#/diagnostics/d',
    );
  });
});

describe('Vue présentateur', () => {
  const ouvrirLaVue = async (bus = unBusEnMemoire(), maintenant = () => 0, client = unClient()) => {
    render(
      <Presentateur
        client={client}
        id="d"
        reglages={courte}
        ouvrirCanal={bus.ouvrir}
        maintenant={maintenant}
      />,
    );
    await screen.findByText('Diapositive 1 / 5');
    return bus;
  };

  it('demande la page affichée à son ouverture, puis la suit', async () => {
    const bus = await ouvrirLaVue();
    expect(bus.envoyes).toContainEqual({ type: 'demande' });

    act(() => {
      bus.diffuser('d', { type: 'page', numero: 2 });
    });

    expect(screen.getByText('Diapositive 3 / 5')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Diapositive affichée' })).getByText(
        'Architecture cible',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Diapositive suivante' })).getByText(
        'Gains attendus',
      ),
    ).toBeInTheDocument();
  });

  it('ignore les messages qui ne lui sont pas destinés', async () => {
    const bus = await ouvrirLaVue();

    act(() => {
      bus.diffuser('d', { type: 'aller', numero: 4 });
      bus.diffuser('d', { type: 'demande' });
    });

    expect(screen.getByText('Diapositive 1 / 5')).toBeInTheDocument();
  });

  it('montre les notes, dont les alertes de cohérence invisibles pour le client', async () => {
    await ouvrirLaVue();

    expect(
      within(screen.getByRole('region', { name: 'Notes du présentateur' })).getByText(
        /À vérifier avant de présenter/,
      ),
    ).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByText('Aucune note pour cette diapositive.')).toBeInTheDocument();
  });

  it('pilote l’écran principal au clavier, sans dépasser les bornes', async () => {
    const bus = await ouvrirLaVue();

    await userEvent.keyboard('{ArrowLeft}');
    expect(bus.envoyes.at(-1)).toStrictEqual({ type: 'aller', numero: 0 });
    await userEvent.keyboard('{ArrowRight}{PageDown} {PageDown}{PageDown}');
    expect(bus.envoyes.at(-1)).toStrictEqual({ type: 'aller', numero: 4 });
    expect(screen.getByText('Fin de la présentation.')).toBeInTheDocument();
    await userEvent.keyboard('{PageUp}');
    expect(bus.envoyes.at(-1)).toStrictEqual({ type: 'aller', numero: 3 });
    const avant = bus.envoyes.length;
    await userEvent.keyboard('x');
    expect(bus.envoyes).toHaveLength(avant);
  });

  it('chronomètre la présentation, et se remet à zéro', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let instant = 0;
    await ouvrirLaVue(unBusEnMemoire(), () => instant);

    instant = 125_000;
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole('timer', { name: 'Temps écoulé' })).toHaveTextContent('02:05');
    await userEvent.click(screen.getByRole('button', { name: 'Remettre le chronomètre à zéro' }));
    expect(screen.getByRole('timer', { name: 'Temps écoulé' })).toHaveTextContent('00:00');
    vi.useRealTimers();
  });

  it('chronomètre par défaut avec l’horloge du navigateur', async () => {
    render(
      <Presentateur
        client={unClient()}
        id="d"
        reglages={courte}
        ouvrirCanal={unBusEnMemoire().ouvrir}
      />,
    );

    expect(await screen.findByRole('timer', { name: 'Temps écoulé' })).toHaveTextContent('00:00');
  });

  it('explique un diagnostic impossible à présenter', async () => {
    render(
      <Presentateur
        client={unClient(vi.fn(() => Promise.resolve(err({ kind: 'Injoignable' as const }))))}
        id="d"
        reglages={courte}
        ouvrirCanal={unBusEnMemoire().ouvrir}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('ne répond pas');
    });
  });
});
