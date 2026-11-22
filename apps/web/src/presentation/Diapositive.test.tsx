import { lireLaSaisie, type SaisieDeProcessus, type SaisieDOption } from '@slideshow/application';
import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '@slideshow/application/testing';
import { construireDeck, type Diapositive, type ParametresDuDeck } from '@slideshow/domain';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiapositiveAffichee } from './Diapositive.js';
import { LIGNES_PAR_PAGE, pagesDuDeck, type Page } from './pages.js';

const lisible = (texte: string | null) => (texte ?? '').replace(/\s/g, ' ');

const unDeck = (
  parametres: ParametresDuDeck = { public: 'technique', duree: 'complete' },
  nombreDeProcessus = 2,
) => {
  const processus = Array.from({ length: nombreDeProcessus }, (_, i) =>
    i === 0
      ? uneSaisieDeProcessus({ nom: 'Saisie des factures' })
      : uneSaisieDeProcessus({
          nom: `Relances ${String(i)}`,
          dureeUnitaireEnSecondes: 600,
          frequence: { nombre: 15, periode: 'semaine' },
          personnes: 1,
          tauxBas: 70,
          tauxHaut: 90,
          coutHoraire: {
            kind: 'DepuisSalaireBrutAnnuel',
            brutAnnuelEnCentimes: 4_000_000,
            coefficientDeCharges: 145,
          },
          profil: {
            nature: 'relance',
            source: { nom: 'Pennylane', categorie: 'comptabilite', acces: 'api' },
            cible: { nom: 'Outlook', categorie: 'messagerie', acces: 'email' },
            donnees: 'structurees',
            decisionHumaine: 'aucune',
          },
        }),
  );
  const lu = lireLaSaisie(
    uneSaisieDeDiagnostic({
      prospect: { nom: 'Négoce Durand', secteur: 'Négoce', effectifTotal: 25 },
      processus,
    }),
    3,
  );
  if (!lu.ok) throw new Error(`saisie de test invalide : ${JSON.stringify(lu.error)}`);
  return pagesDuDeck(construireDeck(lu.value, parametres));
};

const page = (pages: readonly Page[], kind: Diapositive['kind'], numero = 0): Page => {
  const trouvee = pages.filter((p) => p.diapositive.kind === kind)[numero];
  if (trouvee === undefined) throw new Error(`page ${kind} absente`);
  return trouvee;
};

/** Le texte de la diapositive, lu dans son propre rendu. */
const texte = (p: Page) => lisible(render(<DiapositiveAffichee page={p} />).container.textContent);

describe('DiapositiveAffichee', () => {
  it('titre : la promesse, le prospect et la date', () => {
    expect(texte(page(unDeck(), 'Titre'))).toBe(
      'Automatiser vos tâches répétitivesNégoce Durand27 octobre 2026',
    );
  });

  it('observation : le contexte, les outils avec leur catégorie et les processus relevés', () => {
    render(<DiapositiveAffichee page={page(unDeck(), 'Observation')} />);

    expect(screen.getByText('Négoce · 25 salariés')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Outils en place' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toStrictEqual(['Outlook Messagerie', 'Pennylane Comptabilité']);
    expect(
      within(screen.getByRole('list', { name: 'Processus relevés' })).getAllByRole('listitem'),
    ).toHaveLength(2);
  });

  it('observation : sans secteur ni effectif connus', () => {
    const p = page(unDeck(), 'Observation');
    const d = p.diapositive;
    if (d.kind !== 'Observation') throw new Error('diapositive inattendue');
    render(
      <DiapositiveAffichee
        page={{ ...p, diapositive: { ...d, secteur: undefined, effectifTotal: undefined } }}
      />,
    );

    expect(document.querySelector('.contexte')?.textContent).toBe('');
  });

  it('coût caché : le temps, l’argent et les ETP d’aujourd’hui', () => {
    // 608 h (factures) + 114 h (relances) = 722 h
    expect(texte(page(unDeck(), 'CoutCache'))).toContain(
      '722 hpar an, aujourd’hui, sur 2 processus',
    );
  });

  it('tableau : une ligne par processus et le total', () => {
    render(<DiapositiveAffichee page={page(unDeck(), 'TableauDesProcessus')} />);

    const lignes = screen.getAllByRole('row').map((ligne) => lisible(ligne.textContent));

    expect(lignes.slice(0, 2)).toStrictEqual([
      'ProcessusAujourd’huiCoût actuelGain par an',
      'Saisie des factures608 h21 280 €14 896 € à 19 152 €',
    ]);
    expect(lignes[2]).toMatch(/^Relances 1114 h/);
    expect(lignes[3]).toMatch(/^Total722 h/);
  });

  it('tableau réparti : le numéro de page dans le titre, le total sur la dernière seulement', () => {
    const pages = unDeck(undefined, LIGNES_PAR_PAGE + 1);
    const premiere = page(pages, 'TableauDesProcessus', 0);
    const derniere = page(pages, 'TableauDesProcessus', 1);

    expect(texte(premiere)).toContain('Processus par processus · 1/2');
    expect(texte(premiere)).not.toContain('Total');
    expect(texte(derniere)).toContain('Total');
  });

  it('architecture : le schéma et la mention de l’IA', () => {
    render(<DiapositiveAffichee page={page(unDeck(), 'Architecture')} />);

    expect(
      screen.getByRole('img', { name: 'Schéma de l’architecture proposée' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/font appel à l’intelligence artificielle/)).toBeInTheDocument();
  });

  it('architecture : sans mention de l’IA quand aucune brique n’y fait appel', () => {
    const p = page(unDeck(), 'Architecture');
    const d = p.diapositive;
    if (d.kind !== 'Architecture') throw new Error('diapositive inattendue');
    render(<DiapositiveAffichee page={{ ...p, diapositive: { ...d, utiliseIA: false } }} />);

    expect(screen.queryByText(/intelligence artificielle/)).not.toBeInTheDocument();
  });

  it('solution d’un processus : le niveau, les taux et chaque brique justifiée', () => {
    const contenu = texte(page(unDeck(), 'SolutionDUnProcessus', 1));

    expect(contenu).toContain('Relances 1');
    expect(contenu).toContain('automatisation complète · 70 à 90 % du temps gagné');
    expect(contenu).toContain('Planificateur — la tâche est une relance ou un reporting');
  });

  it('gains attendus : la fourchette, les ETP et une barre par processus à la même échelle', () => {
    render(<DiapositiveAffichee page={page(unDeck(), 'GainsAttendus')} />);

    const barres = screen
      .getByRole('list', { name: 'Gain par processus' })
      .querySelectorAll<HTMLElement>('.barre-basse');
    expect(barres).toHaveLength(2);
    expect(Number.parseFloat(barres[0]?.style.width ?? '')).toBeGreaterThan(
      Number.parseFloat(barres[1]?.style.width ?? ''),
    );
    expect(lisible(document.querySelector('.sous-titre')?.textContent ?? '')).toMatch(
      /^par an, soit 0,\d\d ETP à 0,\d\d ETP libérés$/,
    );
  });

  it('feuille de route : les chantiers numérotés, avec leur niveau et leur valeur', () => {
    expect(texte(page(unDeck(), 'FeuilleDeRoute'))).toMatch(
      /1Relances 1automatisation complètejusqu’à .* par an2Saisie des factures/,
    );
  });

  it('hypothèses : le calendrier et le coût horaire de chaque processus, formule comprise', () => {
    const contenu = texte(page(unDeck(), 'Hypotheses'));

    expect(contenu).toContain('228 jours travaillés par an · 1607 h pour un temps plein');
    expect(contenu).toContain('Saisie des factures35,00 €/h');
    expect(contenu).toContain('40 000 € brut × 1,45 / 1607 h = 36,09 €/h');
  });

  it('hypothèses : les semaines de pointe d’une activité saisonnière, et seulement elle', () => {
    const lu = lireLaSaisie(
      uneSaisieDeDiagnostic({
        hypotheses: {
          joursTravaillesParAn: 228,
          heuresAnnuellesTempsPlein: 1_607,
          semainesDePointe: 13,
        },
        processus: [
          uneSaisieDeProcessus({ frequence: { enSaison: 4, horsSaison: 1.5, periode: 'semaine' } }),
        ],
      }),
      1,
    );
    if (!lu.ok) throw new Error('saisie de test invalide');
    const saisonnier = pagesDuDeck(
      construireDeck(lu.value, { public: 'technique', duree: 'complete' }),
    );

    expect(texte(page(saisonnier, 'Hypotheses'))).toContain(
      'dont 13 semaines de pointe : 65 jours en saison, 163 hors saison',
    );
    expect(texte(page(unDeck(), 'Hypotheses'))).not.toContain('semaines de pointe');
  });

  it('se rend pour un dirigeant en version courte', () => {
    const pages = unDeck({ public: 'dirigeant', duree: 'courte' });

    expect(pages.map((p) => p.diapositive.kind)).toStrictEqual([
      'Titre',
      'CoutCache',
      'Architecture',
      'GainsAttendus',
      'FeuilleDeRoute',
    ]);
    expect(texte(page(pages, 'Titre'))).toContain('Négoce Durand');
  });
});

describe('DiapositiveAffichee : options d’hébergement', () => {
  const uneOption = (nom: string, surcharges: Partial<SaisieDOption> = {}): SaisieDOption => ({
    nom,
    miseEnPlaceEnCentimes: 200_000,
    materielEnCentimes: 80_000,
    fraisMensuelsBasEnCentimes: 3_000,
    fraisMensuelsHautEnCentimes: 5_000,
    inclus: ['Serveur dans vos locaux'],
    limites: ['Dépend de votre connexion'],
    ...surcharges,
  });

  const options = (
    liste: readonly SaisieDOption[],
    processus: Partial<SaisieDeProcessus> = {},
  ): Page => {
    const lu = lireLaSaisie(
      uneSaisieDeDiagnostic({ processus: [uneSaisieDeProcessus(processus)], options: liste }),
      1,
    );
    if (!lu.ok) throw new Error('saisie de test invalide');
    return page(
      pagesDuDeck(construireDeck(lu.value, { public: 'dirigeant', duree: 'courte' })),
      'Options',
    );
  };

  it('compare chaque option en coût par heure récupérée, sur 3 ans et la première année', () => {
    // 608 h/an à 70-90 % : 425,6 à 547,2 h gagnées par an, 1 276,8 à 1 641,6 h sur 3 ans.
    // 3 880 € / 1 641,6 h = 2,36 €/h ; 4 600 € / 1 276,8 h = 3,60 €/h.
    const contenu = texte(options([uneOption('Au bureau'), uneOption('Dans le cloud')]));

    expect(contenu).toContain('Deux façons de l’héberger');
    expect(contenu).toContain('Pour 426 h à 547 h gagnées par an, comparées sur 3 ans');
    expect(contenu).toContain('Au bureau2,36 €/h à 3,60 €/hpar heure récupérée');
    expect(contenu).toContain('Sur 3 ans3 880 € à 4 600 €La première année3 160 € à 3 400 €');
    expect(contenu).toContain('Serveur dans vos locauxDépend de votre connexion');
  });

  it.each([
    [1, 'Comment l’héberger'],
    [3, 'Trois façons de l’héberger'],
  ])('s’intitule selon le nombre d’options : %i', (nombre, titre) => {
    const liste = ['A', 'B', 'C'].slice(0, nombre).map((nom) => uneOption(nom));

    expect(texte(options(liste))).toContain(titre);
  });

  it('borne le coût par heure quand l’hypothèse prudente ne gagne aucune heure', () => {
    expect(texte(options([uneOption('A')], { tauxBas: 0 }))).toContain('dès 2,36 €/h');
  });

  it('le dit quand aucune heure n’est gagnée', () => {
    expect(texte(options([uneOption('A')], { tauxBas: 0, tauxHaut: 0 }))).toContain(
      'aucune heure gagnée',
    );
  });
});

describe('DiapositiveAffichee : travail rattrapé', () => {
  const gains = (nombreDeProcessusFaits: number) => {
    const lu = lireLaSaisie(
      uneSaisieDeDiagnostic({
        processus: [
          ...Array.from({ length: nombreDeProcessusFaits }, (_, i) =>
            uneSaisieDeProcessus({ nom: `Tâche ${String(i + 1)}` }),
          ),
          uneSaisieDeProcessus({
            nom: 'Relance des devis',
            dureeUnitaireEnSecondes: 600,
            frequence: { nombre: 15, periode: 'semaine' },
            personnes: 1,
            tauxBas: 80,
            tauxHaut: 95,
            abandonne: true,
          }),
        ],
      }),
      1,
    );
    if (!lu.ok) throw new Error('saisie de test invalide');
    return pagesDuDeck(construireDeck(lu.value, { public: 'dirigeant', duree: 'courte' })).filter(
      (p) => p.diapositive.kind === 'GainsAttendus',
    );
  };

  it('le présente à part, hors gain : 114 h nécessaires, 91 à 108 h rattrapées', () => {
    const [seule] = gains(1);
    const contenu = texte(seule ?? page([], 'GainsAttendus'));

    expect(contenu).toContain(
      'En plus, du travail rattrapé (hors gain) : Relance des devis, 91 h à 108 h par an sur 114 h qui ne sont plus faites',
    );
    expect(contenu).not.toContain('Relance des devis1');
  });

  it('seulement sur la dernière page des gains', () => {
    const pages = gains(LIGNES_PAR_PAGE + 1);

    expect(pages.map((p) => texte(p).includes('travail rattrapé'))).toStrictEqual([false, true]);
  });
});

describe('DiapositiveAffichee : thème du prospect', () => {
  const titre = (theme: { couleur?: string; logo?: string }) => {
    const lu = lireLaSaisie(uneSaisieDeDiagnostic({ theme }), 1);
    if (!lu.ok) throw new Error('saisie de test invalide');
    return page(
      pagesDuDeck(construireDeck(lu.value, { public: 'dirigeant', duree: 'courte' })),
      'Titre',
    );
  };

  it('affiche le logo et la couleur du prospect sur la page de titre', () => {
    render(
      <DiapositiveAffichee
        page={titre({ couleur: '#1f5fbf', logo: 'data:image/png;base64,AAAA' })}
      />,
    );

    expect(screen.getByRole('img', { name: 'Logo de Négoce Durand' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AAAA',
    );
    expect(screen.getByText('Négoce Durand')).toHaveStyle({ color: '#1f5fbf' });
  });

  it('se passe de logo et de couleur', () => {
    render(<DiapositiveAffichee page={titre({})} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Négoce Durand').getAttribute('style')).toBeNull();
  });
});
