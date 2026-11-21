import {
  MODELES_D_OPTIONS,
  MODELES_DE_PROCESSUS,
  type ModeleDOption,
  type SaisieDeProcessus,
} from '@slideshow/application';
import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '@slideshow/application/testing';
import { describe, expect, it } from 'vitest';
import {
  ajouterUneOption,
  ajouterUnProcessus,
  appliquerUnModele,
  avecAbandon,
  enFrequenceReguliere,
  enFrequenceSaisonniere,
  nomLibre,
  outilsCites,
  processusVierge,
  reconcilierLesTaux,
  remplacerLeProcessus,
  remplacerLOption,
  retirerLeProcessus,
  retirerLOption,
} from './saisieDeTravail.js';

const outil = (nom: string, acces: 'api' | 'email' | 'aucun' = 'api') => ({
  nom,
  categorie: 'autre' as const,
  acces,
});

const avecProfil = (
  processus: SaisieDeProcessus,
  profil: Partial<SaisieDeProcessus['profil']>,
): SaisieDeProcessus => ({ ...processus, profil: { ...processus.profil, ...profil } });

const modele = (id: string) => {
  const trouve = MODELES_DE_PROCESSUS.find((m) => m.id === id);
  if (trouve === undefined) throw new Error(id);
  return trouve;
};

describe('saisie de travail', () => {
  describe('processusVierge', () => {
    it('démarre avec des valeurs plausibles et des outils à renseigner', () => {
      expect(processusVierge('Processus 1')).toStrictEqual({
        nom: 'Processus 1',
        dureeUnitaireEnSecondes: 300,
        frequence: { nombre: 1, periode: 'jour' },
        personnes: 1,
        tauxBas: 70,
        tauxHaut: 90,
        coutHoraire: { kind: 'Direct', centimesParHeure: 3_500 },
        profil: {
          nature: 'saisie',
          source: { nom: '', categorie: 'autre', acces: 'api' },
          cible: { nom: '', categorie: 'autre', acces: 'api' },
          donnees: 'structurees',
          decisionHumaine: 'aucune',
        },
      });
    });
  });

  describe('nomLibre', () => {
    it('garde le nom s’il est libre, sinon le numérote, sans tenir compte de la casse', () => {
      const saisie = uneSaisieDeDiagnostic({
        processus: [
          uneSaisieDeProcessus({ nom: 'Relances' }),
          uneSaisieDeProcessus({ nom: 'relances (2)' }),
        ],
      });

      expect(nomLibre(saisie, 'Devis')).toBe('Devis');
      expect(nomLibre(saisie, 'Relances')).toBe('Relances (3)');
    });
  });

  describe('ajouter, remplacer, retirer', () => {
    it('ajoute un processus à la fin', () => {
      const saisie = uneSaisieDeDiagnostic({ processus: [] });

      expect(
        ajouterUnProcessus(saisie, processusVierge('A')).processus.map((p) => p.nom),
      ).toStrictEqual(['A']);
    });

    it('remplace un processus sans toucher aux autres', () => {
      const saisie = uneSaisieDeDiagnostic({
        processus: [uneSaisieDeProcessus({ nom: 'A' }), uneSaisieDeProcessus({ nom: 'B' })],
      });

      const modifiee = remplacerLeProcessus(saisie, 1, uneSaisieDeProcessus({ nom: 'C' }));

      expect(modifiee.processus.map((p) => p.nom)).toStrictEqual(['A', 'C']);
      expect(saisie.processus.map((p) => p.nom)).toStrictEqual(['A', 'B']);
    });

    it('retire un processus', () => {
      const saisie = uneSaisieDeDiagnostic({
        processus: [uneSaisieDeProcessus({ nom: 'A' }), uneSaisieDeProcessus({ nom: 'B' })],
      });

      expect(retirerLeProcessus(saisie, 0).processus.map((p) => p.nom)).toStrictEqual(['B']);
    });
  });

  describe('outilsCites', () => {
    it('liste chaque outil nommé une fois, dans l’ordre où il apparaît', () => {
      const saisie = uneSaisieDeDiagnostic({
        processus: [
          avecProfil(uneSaisieDeProcessus(), {
            source: outil('Outlook', 'email'),
            cible: outil('Pennylane'),
          }),
          avecProfil(uneSaisieDeProcessus(), { source: outil('pennylane'), cible: outil('') }),
        ],
      });

      expect(outilsCites(saisie)).toStrictEqual([outil('Outlook', 'email'), outil('Pennylane')]);
    });
  });

  describe('reconcilierLesTaux', () => {
    const complet = () =>
      avecProfil(uneSaisieDeProcessus({ tauxBas: 70, tauxHaut: 90 }), {
        source: outil('CRM'),
        cible: outil('Compta'),
        donnees: 'structurees',
        decisionHumaine: 'aucune',
      });

    it('suit la nouvelle suggestion quand les taux suivaient l’ancienne', () => {
      const avant = complet();
      const apres = avecProfil(avant, { donnees: 'documents' });

      expect(reconcilierLesTaux(avant, apres)).toMatchObject({ tauxBas: 40, tauxHaut: 70 });
    });

    it('laisse l’utilisateur modifier les taux tant que le profil ne change pas', () => {
      const avant = complet();
      const apres = { ...avant, tauxBas: 55 };

      expect(reconcilierLesTaux(avant, apres)).toBe(apres);
    });

    it('garde des taux ajustés à la main', () => {
      const avant = { ...complet(), tauxBas: 50, tauxHaut: 60 };
      const apres = avecProfil(avant, { donnees: 'documents' });

      expect(reconcilierLesTaux(avant, apres)).toMatchObject({ tauxBas: 50, tauxHaut: 60 });
    });

    it('adopte la première suggestion disponible, quand les outils viennent d’être renseignés', () => {
      const avant = processusVierge('A');
      const apres = avecProfil(avant, { source: outil('CRM'), cible: outil('Compta', 'aucun') });

      expect(reconcilierLesTaux(avant, apres)).toMatchObject({ tauxBas: 40, tauxHaut: 70 });
    });

    it('ne change rien tant qu’aucune suggestion n’est possible', () => {
      const avant = processusVierge('A');
      const apres = { ...avant, nom: 'B' };

      expect(reconcilierLesTaux(avant, apres)).toBe(apres);
    });
  });

  describe('appliquerUnModele', () => {
    it('reprend la nature et les ordres de grandeur du modèle, sous un nom libre', () => {
      const saisie = uneSaisieDeDiagnostic({
        processus: [uneSaisieDeProcessus({ nom: 'Relances des impayés' })],
      });

      const applique = appliquerUnModele(
        saisie,
        processusVierge('Processus 2'),
        modele('relances-impayes'),
      );

      expect(applique).toMatchObject({
        nom: 'Relances des impayés (2)',
        dureeUnitaireEnSecondes: 600,
        frequence: { nombre: 15, periode: 'semaine' },
        profil: { nature: 'relance', donnees: 'structurees', decisionHumaine: 'aucune' },
      });
    });

    it('ne numérote pas un processus qui porte déjà le nom du modèle (modèle réappliqué)', () => {
      // Trouvé par le parcours E2E : au clavier, chaque lettre tapée dans la liste réapplique le modèle.
      const relances = { ...processusVierge('Relances des impayés') };
      const saisie = uneSaisieDeDiagnostic({
        processus: [uneSaisieDeProcessus({ nom: 'Autre' }), relances],
      });

      expect(appliquerUnModele(saisie, relances, modele('relances-impayes')).nom).toBe(
        'Relances des impayés',
      );
    });

    it('garde les outils, l’effectif et le coût déjà saisis', () => {
      const processus = avecProfil(
        {
          ...processusVierge('A'),
          personnes: 4,
          coutHoraire: { kind: 'Direct', centimesParHeure: 4_200 },
        },
        { source: outil('Outlook', 'email'), cible: outil('Pennylane') },
      );

      const applique = appliquerUnModele(
        uneSaisieDeDiagnostic({ processus: [] }),
        processus,
        modele('tri-mails'),
      );

      expect(applique).toMatchObject({
        personnes: 4,
        coutHoraire: { kind: 'Direct', centimesParHeure: 4_200 },
        profil: { source: outil('Outlook', 'email'), cible: outil('Pennylane') },
      });
    });

    it('propose les taux suggérés pour le nouveau profil', () => {
      const processus = avecProfil(processusVierge('A'), {
        source: outil('Outlook', 'email'),
        cible: outil('Pennylane'),
      });

      expect(
        appliquerUnModele(
          uneSaisieDeDiagnostic({ processus: [] }),
          processus,
          modele('saisie-factures-fournisseurs'),
        ),
      ).toMatchObject({ tauxBas: 40, tauxHaut: 70 });
    });
  });
});

describe('fréquence saisonnière', () => {
  it('reprend la même valeur en saison et hors saison : aucun chiffre ne change', () => {
    expect(enFrequenceSaisonniere({ nombre: 20, periode: 'jour' })).toStrictEqual({
      enSaison: 20,
      horsSaison: 20,
      periode: 'jour',
    });
  });

  it.each(['semaine', 'mois', 'an'] as const)(
    'compte une fréquence par %s en semaines, la seule autre période d’une saison',
    (periode) => {
      expect(enFrequenceSaisonniere({ nombre: 3, periode })).toMatchObject({ periode: 'semaine' });
    },
  );

  it('ne change pas une fréquence déjà saisonnière', () => {
    const saisonniere = { enSaison: 4, horsSaison: 1.5, periode: 'semaine' } as const;

    expect(enFrequenceSaisonniere(saisonniere)).toBe(saisonniere);
    expect(enFrequenceReguliere({ nombre: 2, periode: 'mois' })).toStrictEqual({
      nombre: 2,
      periode: 'mois',
    });
  });

  it('redevient régulière avec la valeur hors saison', () => {
    expect(
      enFrequenceReguliere({ enSaison: 4, horsSaison: 1.5, periode: 'semaine' }),
    ).toStrictEqual({ nombre: 1.5, periode: 'semaine' });
  });

  it('redevient régulière avec la valeur en saison si l’activité n’existe qu’en saison', () => {
    expect(enFrequenceReguliere({ enSaison: 10, horsSaison: 0, periode: 'jour' })).toStrictEqual({
      nombre: 10,
      periode: 'jour',
    });
  });
});

describe('options d’hébergement', () => {
  const modeleDOption = (id: string): ModeleDOption => {
    const trouve = MODELES_D_OPTIONS.find((m) => m.id === id);
    if (trouve === undefined) throw new Error(id);
    return trouve;
  };
  const nomsDesOptions = (saisie: ReturnType<typeof uneSaisieDeDiagnostic>) =>
    (saisie.options ?? []).map((o) => o.nom);

  it('ajoute une option à partir d’un modèle', () => {
    const saisie = ajouterUneOption(uneSaisieDeDiagnostic(), modeleDOption('dans-le-cloud'));

    expect(saisie.options).toStrictEqual([modeleDOption('dans-le-cloud').saisie]);
  });

  it('donne un nom libre au même modèle ajouté deux fois', () => {
    let saisie = uneSaisieDeDiagnostic();
    for (let i = 0; i < 3; i++) saisie = ajouterUneOption(saisie, modeleDOption('au-bureau'));

    expect(nomsDesOptions(saisie)).toStrictEqual(['Au bureau', 'Au bureau (2)', 'Au bureau (3)']);
  });

  it('remplace une option, et retire la dernière sans laisser de champ vide', () => {
    const deux = ajouterUneOption(
      ajouterUneOption(uneSaisieDeDiagnostic(), modeleDOption('au-bureau')),
      modeleDOption('dans-le-cloud'),
    );
    const renommee = remplacerLOption(deux, 1, {
      ...modeleDOption('dans-le-cloud').saisie,
      nom: 'Cloud',
    });

    expect(nomsDesOptions(renommee)).toStrictEqual(['Au bureau', 'Cloud']);
    expect(nomsDesOptions(retirerLOption(renommee, 0))).toStrictEqual(['Cloud']);
    expect(retirerLOption(retirerLOption(renommee, 0), 0)).toStrictEqual(uneSaisieDeDiagnostic());
  });
});

describe('tâche abandonnée', () => {
  it('ne porte le champ que si elle n’est plus faite', () => {
    const faite = uneSaisieDeProcessus();
    const abandonnee = avecAbandon(faite, true);

    expect(abandonnee).toStrictEqual({ ...faite, abandonne: true });
    expect(avecAbandon(abandonnee, false)).toStrictEqual(faite);
  });
});
