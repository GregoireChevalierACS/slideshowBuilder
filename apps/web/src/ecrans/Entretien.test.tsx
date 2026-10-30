import type { SaisieDeDiagnostic } from '@slideshow/application';
import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '@slideshow/application/testing';
import { err, ok } from '@slideshow/domain';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ClientDeLApi, ErreurDApi } from '../api/clientDeLApi.js';
import { FournisseurDeRaccourcis } from '../raccourcis/ContexteDesRaccourcis.js';
import { Entretien } from './Entretien.js';

/** Un faux serveur qui applique la même règle de version que le vrai (409 si périmée). */
const unFauxServeur = (initiale: SaisieDeDiagnostic = uneSaisieDeDiagnostic()) => {
  const etat = { version: 1, saisie: initiale };
  const conflit: ErreurDApi = {
    kind: 'Probleme',
    probleme: {
      type: '/problemes/version-perimee',
      title: 'Version périmée',
      status: 409,
      versionActuelle: 0,
    },
  };
  const client: ClientDeLApi = {
    listerLesDiagnostics: vi.fn(),
    ouvrirUnDiagnostic: vi.fn(),
    consulterUnDiagnostic: vi.fn(() => Promise.resolve(ok({ id: 'd', ...etat }))),
    importerDesDiagnostics: vi.fn(),
    reviserUnDiagnostic: vi.fn<ClientDeLApi['reviserUnDiagnostic']>(
      (_id, versionAttendue, modifications) => {
        if (versionAttendue !== etat.version) {
          return Promise.resolve(
            err({ ...conflit, probleme: { ...conflit.probleme, versionActuelle: etat.version } }),
          );
        }
        etat.version += 1;
        etat.saisie = { ...modifications, dateDEntretien: etat.saisie.dateDEntretien };
        return Promise.resolve(ok({ id: 'd', ...etat }));
      },
    ),
  };
  return { client, etat };
};

const afficher = async (client: ClientDeLApi) => {
  render(
    <FournisseurDeRaccourcis stockage={undefined}>
      <Entretien client={client} id="d" delai={0} />
    </FournisseurDeRaccourcis>,
  );
  await screen.findByRole('heading', { name: 'Négoce Durand' });
};

const enDirect = () => within(screen.getByRole('complementary', { name: 'En direct' }));
const lisible = (texte: string | null) => (texte ?? '').replace(/\s/g, ' ');
const enregistre = async (version: number) => {
  await waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent(`Enregistré · version ${String(version)}`);
  });
};

describe('Entretien', () => {
  it('montre les processus, le formulaire du premier et ses chiffres en direct', async () => {
    await afficher(unFauxServeur().client);

    expect(
      screen.getByRole('button', { name: 'Saisie des factures fournisseurs' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(screen.getByLabelText('Nom du processus')).toHaveValue(
      'Saisie des factures fournisseurs',
    );
    expect(screen.getByLabelText('Durée d’une exécution')).toHaveValue('4');
    // 4 min × 20 × 228 jours × 2 personnes = 608 h, à 35 €/h
    const panneau = lisible(screen.getByRole('complementary', { name: 'En direct' }).textContent);
    expect(panneau).toContain('608 h/an, soit 21 280 €');
    expect(panneau).toContain('Niveau : automatisation assistée');
    expect(enDirect().getByText(/Extraction de documents/)).toHaveTextContent('IA');
    expect(screen.getByRole('status')).toHaveTextContent('Enregistré · version 1');
  });

  it('propose d’exporter ce diagnostic dans un fichier', async () => {
    await afficher(unFauxServeur().client);

    const lien = screen.getByRole('link', { name: 'Exporter' });
    expect(lien).toHaveAttribute('href', '/api/diagnostics/d/export');
    expect(lien).toHaveAttribute('download');
  });

  it('crée un processus au clavier à partir d’un modèle, puis l’enregistre', async () => {
    const { client, etat } = unFauxServeur();
    await afficher(client);

    await userEvent.keyboard('{Alt>}n{/Alt}');
    const modele = screen.getByLabelText('Partir d’un modèle');
    expect(modele).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Nouveau processus' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(enDirect().getByText(/À compléter : Nom de l’outil à renseigner/)).toBeInTheDocument();

    await userEvent.selectOptions(modele, 'Relances des impayés');
    expect(screen.getByLabelText('Nom du processus')).toHaveValue('Relances des impayés');
    // Outils déjà cités : la catégorie et l'accès sont repris.
    await userEvent.type(screen.getByLabelText('Outil source'), 'Pennylane');
    await userEvent.type(screen.getByLabelText('Outil cible'), 'Outlook');
    expect(screen.getByLabelText('Accès (outil cible)')).toHaveValue('email');

    expect(lisible(screen.getByRole('complementary', { name: 'En direct' }).textContent)).toContain(
      '114 h/an',
    );
    await enregistre(etat.version);
    expect(etat.saisie.processus.map((p) => p.nom)).toStrictEqual([
      'Saisie des factures fournisseurs',
      'Relances des impayés',
    ]);
  });

  it('passe d’un processus à l’autre au clavier', async () => {
    await afficher(
      unFauxServeur(
        uneSaisieDeDiagnostic({
          processus: [
            uneSaisieDeProcessus({ nom: 'Premier' }),
            uneSaisieDeProcessus({ nom: 'Second' }),
          ],
        }),
      ).client,
    );

    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(screen.getByLabelText('Nom du processus')).toHaveValue('Premier');
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(screen.getByLabelText('Nom du processus')).toHaveValue('Second');
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(screen.getByLabelText('Nom du processus')).toHaveValue('Second');
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(screen.getByLabelText('Nom du processus')).toHaveValue('Premier');
    await userEvent.click(screen.getByRole('button', { name: 'Second' }));
    await userEvent.click(screen.getByRole('button', { name: 'Premier' }));
    expect(screen.getByLabelText('Nom du processus')).toHaveValue('Premier');
  });

  it('ne fait rien d’Alt+↑ quand les hypothèses sont affichées', async () => {
    await afficher(unFauxServeur().client);

    await userEvent.click(screen.getByRole('button', { name: 'Hypothèses de calcul' }));
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}{Alt>}{ArrowDown}{/Alt}');

    expect(screen.getByLabelText('Jours travaillés par an')).toBeInTheDocument();
  });

  it('ignore Alt+N tant que le diagnostic n’est pas chargé', async () => {
    const client: ClientDeLApi = {
      ...unFauxServeur().client,
      consulterUnDiagnostic: vi.fn(() => new Promise<never>(() => undefined)),
    };
    render(
      <FournisseurDeRaccourcis stockage={undefined}>
        <Entretien client={client} id="d" />
      </FournisseurDeRaccourcis>,
    );

    await userEvent.keyboard('{Alt>}n{/Alt}');

    expect(client.reviserUnDiagnostic).not.toHaveBeenCalled();
  });

  it('ne soumet rien quand on valide un champ avec Entrée', async () => {
    const { client } = unFauxServeur();
    await afficher(client);

    await userEvent.type(screen.getByLabelText('Nom du processus'), '{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Hypothèses de calcul' }));
    await userEvent.type(screen.getByLabelText('Jours travaillés par an'), '{Enter}');

    expect(screen.getByLabelText('Jours travaillés par an')).toBeInTheDocument();
    expect(client.reviserUnDiagnostic).not.toHaveBeenCalled();
  });

  it('passe à la section suivante avec Ctrl+Entrée', async () => {
    await afficher(unFauxServeur().client);

    await userEvent.click(screen.getByLabelText('Nom du processus'));
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    expect(screen.getByLabelText('Durée d’une exécution')).toHaveFocus();
  });

  it('signale sous le champ une valeur refusée, sans rien envoyer', async () => {
    const { client } = unFauxServeur();
    await afficher(client);

    await userEvent.clear(screen.getByLabelText('Personnes concernées'));
    await userEvent.type(screen.getByLabelText('Personnes concernées'), '0');

    expect(screen.getByLabelText('Personnes concernées')).toHaveAccessibleDescription(
      'Au moins une personne.',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Non enregistré : Au moins une personne.');
    expect(client.reviserUnDiagnostic).not.toHaveBeenCalled();
  });

  it('modifie la durée, la fréquence et le profil, et suit la suggestion de taux', async () => {
    const { client, etat } = unFauxServeur();
    await afficher(client);

    await userEvent.clear(screen.getByLabelText('Durée d’une exécution'));
    await userEvent.type(screen.getByLabelText('Durée d’une exécution'), '3');
    await userEvent.clear(screen.getByLabelText('Nombre de fois, par personne'));
    await userEvent.type(screen.getByLabelText('Nombre de fois, par personne'), '10');
    await userEvent.selectOptions(screen.getByLabelText('Période'), 'par semaine');
    await userEvent.selectOptions(screen.getByLabelText('Données'), 'Structurées');
    await userEvent.selectOptions(screen.getByLabelText('Décision humaine'), 'Aucune');
    await userEvent.selectOptions(
      screen.getByLabelText('Nature de la tâche'),
      'Transfert entre outils',
    );
    await userEvent.selectOptions(screen.getByLabelText('Catégorie (outil source)'), 'Tableur');
    await userEvent.selectOptions(screen.getByLabelText('Accès (outil source)'), 'API');

    // Profil devenu entièrement automatisable : les taux suivent la suggestion (70 à 90 %).
    expect(screen.getByLabelText('Taux bas (prudent)')).toHaveValue('70');
    expect(screen.getByLabelText('Taux haut (optimiste)')).toHaveValue('90');
    await waitFor(() => {
      expect(etat.saisie.processus[0]).toMatchObject({
        dureeUnitaireEnSecondes: 180,
        frequence: { nombre: 10, periode: 'semaine' },
        profil: { nature: 'transfert', source: { categorie: 'tableur', acces: 'api' } },
      });
    });
  });

  it('garde des taux ajustés à la main, et réapplique la suggestion sur demande', async () => {
    await afficher(unFauxServeur().client);

    await userEvent.clear(screen.getByLabelText('Taux bas (prudent)'));
    await userEvent.type(screen.getByLabelText('Taux bas (prudent)'), '50');
    await userEvent.clear(screen.getByLabelText('Taux haut (optimiste)'));
    await userEvent.type(screen.getByLabelText('Taux haut (optimiste)'), '60');
    expect(screen.getByText(/Suggéré : automatisation assistée, 40 à 70 %/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Appliquer la suggestion' }));

    expect(screen.getByLabelText('Taux bas (prudent)')).toHaveValue('40');
    expect(
      screen.queryByRole('button', { name: 'Appliquer la suggestion' }),
    ).not.toBeInTheDocument();
  });

  it('déduit le coût horaire du salaire brut, puis revient à un coût saisi', async () => {
    const { client, etat } = unFauxServeur();
    await afficher(client);

    await userEvent.selectOptions(screen.getByLabelText('Coût horaire'), 'Déduit du salaire brut');
    await userEvent.clear(screen.getByLabelText('Salaire brut annuel'));
    await userEvent.type(screen.getByLabelText('Salaire brut annuel'), '45000');
    await userEvent.clear(screen.getByLabelText('Coefficient de charges'));
    await userEvent.type(screen.getByLabelText('Coefficient de charges'), '1,5');
    await waitFor(() => {
      expect(etat.saisie.processus[0]?.coutHoraire).toStrictEqual({
        kind: 'DepuisSalaireBrutAnnuel',
        brutAnnuelEnCentimes: 4_500_000,
        coefficientDeCharges: 150,
      });
    });

    await userEvent.selectOptions(screen.getByLabelText('Coût horaire'), 'Saisi directement');
    await userEvent.clear(screen.getByLabelText('Coût chargé d’une heure'));
    await userEvent.type(screen.getByLabelText('Coût chargé d’une heure'), '42,5');
    await waitFor(() => {
      expect(etat.saisie.processus[0]?.coutHoraire).toStrictEqual({
        kind: 'Direct',
        centimesParHeure: 4_250,
      });
    });
  });

  it('supprime un processus après confirmation', async () => {
    await afficher(unFauxServeur().client);

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer ce processus' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));

    expect(screen.getByText(/Aucun processus pour l’instant/)).toBeInTheDocument();
    expect(screen.queryByRole('section', { name: 'Tout le diagnostic' })).not.toBeInTheDocument();
  });

  it('modifie les hypothèses de calcul', async () => {
    const { client, etat } = unFauxServeur();
    await afficher(client);

    await userEvent.click(screen.getByRole('button', { name: 'Hypothèses de calcul' }));
    await userEvent.clear(screen.getByLabelText('Jours travaillés par an'));
    await userEvent.type(screen.getByLabelText('Jours travaillés par an'), '218');
    await userEvent.clear(screen.getByLabelText('Heures annuelles d’un temps plein'));
    await userEvent.type(screen.getByLabelText('Heures annuelles d’un temps plein'), '1600');

    await waitFor(() => {
      expect(etat.saisie.hypotheses).toStrictEqual({
        joursTravaillesParAn: 218,
        heuresAnnuellesTempsPlein: 1_600,
      });
    });
  });

  it('montre le total du diagnostic et les alertes de cohérence', async () => {
    await afficher(
      unFauxServeur(
        uneSaisieDeDiagnostic({
          processus: [
            uneSaisieDeProcessus({
              nom: 'Tri du courrier',
              dureeUnitaireEnSecondes: 8 * 3_600,
              frequence: { nombre: 1, periode: 'jour' },
            }),
          ],
        }),
      ).client,
    );

    expect(enDirect().getByRole('alert')).toHaveTextContent('1824 h par personne et par an');
    expect(enDirect().getByText(/Total \(1 processus\)/)).toBeInTheDocument();
  });

  it('signale une modification faite ailleurs et recharge la version actuelle', async () => {
    const { client, etat } = unFauxServeur();
    await afficher(client);
    etat.version = 3;
    etat.saisie = uneSaisieDeDiagnostic({ prospect: { nom: 'Négoce Durand' }, processus: [] });

    await userEvent.type(screen.getByLabelText('Nom du processus'), ' bis');
    expect(await screen.findByRole('alert')).toHaveTextContent('modifié ailleurs (version 3)');
    await userEvent.click(screen.getByRole('button', { name: 'Recharger la version actuelle' }));

    await enregistre(3);
    expect(screen.getByText(/Aucun processus pour l’instant/)).toBeInTheDocument();
  });

  it('explique un enregistrement impossible', async () => {
    const { client } = unFauxServeur();
    vi.mocked(client.reviserUnDiagnostic).mockResolvedValue(err({ kind: 'Injoignable' }));
    await afficher(client);

    await userEvent.type(screen.getByLabelText('Nom du processus'), ' bis');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Non enregistré : Le serveur ne répond pas',
    );
  });

  it('explique un diagnostic introuvable', async () => {
    const client: ClientDeLApi = {
      ...unFauxServeur().client,
      consulterUnDiagnostic: vi.fn(() => Promise.resolve(err({ kind: 'Injoignable' as const }))),
    };
    render(<Entretien client={client} id="d" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Le serveur ne répond pas');
  });
});
