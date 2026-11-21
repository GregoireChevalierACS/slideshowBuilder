import {
  MODELES_DE_PROCESSUS,
  suggererLesTaux,
  type SaisieDeCoutHoraire,
  type SaisieDeDiagnostic,
  type SaisieDeFrequence,
  type SaisieDeProcessus,
  type SaisieDOutil,
  type SaisieInvalide,
} from '@slideshow/application';
import { useState } from 'react';
import { useRaccourci } from '../raccourcis/ContexteDesRaccourcis.js';
import { messageDuChamp } from './affichage.js';
import { ChampDeChoix, ChampNumerique, ChampTexte, Section } from './champs.js';
import {
  CHOIX_DES_ACCES,
  CHOIX_DES_CATEGORIES,
  CHOIX_DES_DECISIONS,
  CHOIX_DES_DONNEES,
  CHOIX_DES_NATURES,
  CHOIX_DES_PERIODES,
  CHOIX_DES_PERIODES_SAISONNIERES,
  LIBELLES_DES_NIVEAUX,
} from './libelles.js';
import {
  appliquerUnModele,
  enFrequenceReguliere,
  avecAbandon,
  enFrequenceSaisonniere,
  outilsCites,
  reconcilierLesTaux,
} from './saisieDeTravail.js';

const SECONDES_PAR_MINUTE = 60;

const COUT_DIRECT_PAR_DEFAUT: SaisieDeCoutHoraire = { kind: 'Direct', centimesParHeure: 3_500 };
const COUT_DEPUIS_SALAIRE_PAR_DEFAUT: SaisieDeCoutHoraire = {
  kind: 'DepuisSalaireBrutAnnuel',
  brutAnnuelEnCentimes: 4_000_000,
  coefficientDeCharges: 145,
};

const ChampsDOutil = ({
  titre,
  outil,
  modifier,
  erreur,
  cites,
}: {
  readonly titre: string;
  readonly outil: SaisieDOutil;
  readonly modifier: (outil: SaisieDOutil) => void;
  readonly erreur: string | undefined;
  readonly cites: readonly SaisieDOutil[];
}) => (
  <div className="outil">
    <ChampTexte
      libelle={titre}
      valeur={outil.nom}
      erreur={erreur}
      suggestions={cites.map((c) => c.nom)}
      modifier={(nom) => {
        // Un outil déjà cité reprend sa catégorie et son accès : on ne les saisit qu'une fois.
        const connu = cites.find(
          (c) => c.nom.toLocaleLowerCase('fr') === nom.toLocaleLowerCase('fr'),
        );
        modifier(connu === undefined ? { ...outil, nom } : { ...connu, nom });
      }}
    />
    <ChampDeChoix
      libelle={`Catégorie (${titre.toLocaleLowerCase('fr')})`}
      valeur={outil.categorie}
      choix={CHOIX_DES_CATEGORIES}
      modifier={(categorie) => {
        modifier({ ...outil, categorie });
      }}
    />
    <ChampDeChoix
      libelle={`Accès (${titre.toLocaleLowerCase('fr')})`}
      valeur={outil.acces}
      choix={CHOIX_DES_ACCES}
      modifier={(acces) => {
        modifier({ ...outil, acces });
      }}
    />
  </div>
);

/** Une fréquence régulière, ou deux valeurs (en saison, hors saison) pour une activité saisonnière. */
const ChampsDeFrequence = ({
  frequence,
  erreur,
  modifier,
}: {
  readonly frequence: SaisieDeFrequence;
  readonly erreur: string | undefined;
  readonly modifier: (frequence: SaisieDeFrequence) => void;
}) =>
  'enSaison' in frequence ? (
    <>
      <ChampNumerique
        libelle="Nombre de fois en saison, par personne"
        valeur={frequence.enSaison}
        modifier={(enSaison) => {
          modifier({ ...frequence, enSaison });
        }}
      />
      <ChampNumerique
        libelle="Nombre de fois hors saison, par personne"
        valeur={frequence.horsSaison}
        erreur={erreur}
        modifier={(horsSaison) => {
          modifier({ ...frequence, horsSaison });
        }}
      />
      <ChampDeChoix
        libelle="Période"
        valeur={frequence.periode}
        choix={CHOIX_DES_PERIODES_SAISONNIERES}
        modifier={(periode) => {
          modifier({ ...frequence, periode });
        }}
      />
    </>
  ) : (
    <>
      <ChampNumerique
        libelle="Nombre de fois, par personne"
        valeur={frequence.nombre}
        erreur={erreur}
        modifier={(nombre) => {
          modifier({ ...frequence, nombre });
        }}
      />
      <ChampDeChoix
        libelle="Période"
        valeur={frequence.periode}
        choix={CHOIX_DES_PERIODES}
        modifier={(periode) => {
          modifier({ ...frequence, periode });
        }}
      />
    </>
  );

/**
 * À la fin de la section : le cas courant (une fréquence régulière) se saisit au clavier sans
 * passer par cette case.
 */
const InterrupteurDeSaison = ({
  frequence,
  sansSaison,
  modifier,
}: {
  readonly frequence: SaisieDeFrequence;
  /** Aucune semaine de pointe dans les hypothèses : la valeur en saison ne compte pas encore. */
  readonly sansSaison: boolean;
  readonly modifier: (frequence: SaisieDeFrequence) => void;
}) => (
  <>
    <label className="interrupteur">
      <input
        type="checkbox"
        checked={'enSaison' in frequence}
        onChange={(evenement) => {
          modifier(
            evenement.target.checked
              ? enFrequenceSaisonniere(frequence)
              : enFrequenceReguliere(frequence),
          );
        }}
      />
      Activité saisonnière
    </label>
    {'enSaison' in frequence && sansSaison && (
      <p className="aide">
        Aucune semaine de pointe dans les hypothèses : seule la valeur hors saison compte.
      </p>
    )}
  </>
);

/** Le formulaire d'un processus, dans l'ordre de l'entretien : quoi, combien, avec quoi, comment, coût, taux. */
export const FormulaireDuProcessus = ({
  saisie,
  position,
  processus,
  modifier,
  supprimer,
  erreur,
  nouveau,
}: {
  readonly saisie: SaisieDeDiagnostic;
  readonly position: number;
  readonly processus: SaisieDeProcessus;
  readonly modifier: (processus: SaisieDeProcessus) => void;
  readonly supprimer: () => void;
  readonly erreur: SaisieInvalide | undefined;
  /** Tout juste créé : la saisie commence aussitôt par le choix d'un modèle. */
  readonly nouveau: boolean;
}) => {
  const [suppressionDemandee, setSuppressionDemandee] = useState(false);
  const champ = (nom: string) => messageDuChamp(erreur, `processus[${String(position)}].${nom}`);
  const changer = (nouveau: SaisieDeProcessus) => {
    modifier(reconcilierLesTaux(processus, nouveau));
  };
  const profil = (changement: Partial<SaisieDeProcessus['profil']>) => {
    changer({ ...processus, profil: { ...processus.profil, ...changement } });
  };
  const cites = outilsCites(saisie);
  const suggestion = suggererLesTaux(processus.profil);
  const { coutHoraire } = processus;

  useRaccourci('sectionSuivante', () => {
    const sections = [...document.querySelectorAll('.formulaire-du-processus fieldset')];
    const courante = sections.findIndex((s) => s.contains(document.activeElement));
    // Le premier champ de la section suivante ; après la dernière, on revient à la première.
    for (const section of [...sections.slice(courante + 1), ...sections]) {
      for (const champ of section.querySelectorAll<HTMLElement>('input, select')) {
        champ.focus();
        return;
      }
    }
  });

  return (
    <form className="formulaire-du-processus" aria-label={`Processus : ${processus.nom}`}>
      <Section titre="① Quoi">
        <label className="champ">
          Partir d’un modèle
          <select
            // Un processus tout juste créé : la saisie commence par le choix d'un modèle.
            autoFocus={nouveau}
            value=""
            onChange={(evenement) => {
              // Le modèle choisi (l'option « Choisir un modèle » reste affichée, elle ne change rien).
              MODELES_DE_PROCESSUS.filter((m) => m.id === evenement.target.value).forEach((m) => {
                modifier(appliquerUnModele(saisie, processus, m));
              });
            }}
          >
            <option value="">— Choisir un modèle —</option>
            {MODELES_DE_PROCESSUS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </label>
        <ChampTexte
          libelle="Nom du processus"
          valeur={processus.nom}
          erreur={champ('nom')}
          modifier={(nom) => {
            changer({ ...processus, nom });
          }}
        />
      </Section>

      <Section titre="② Combien">
        <ChampNumerique
          libelle="Durée d’une exécution"
          unite="min"
          valeur={processus.dureeUnitaireEnSecondes / SECONDES_PAR_MINUTE}
          erreur={champ('dureeUnitaireEnSecondes')}
          modifier={(minutes) => {
            changer({ ...processus, dureeUnitaireEnSecondes: minutes * SECONDES_PAR_MINUTE });
          }}
        />
        <ChampsDeFrequence
          frequence={processus.frequence}
          erreur={champ('frequence')}
          modifier={(frequence) => {
            changer({ ...processus, frequence });
          }}
        />
        <ChampNumerique
          libelle="Personnes concernées"
          valeur={processus.personnes}
          erreur={champ('personnes')}
          modifier={(personnes) => {
            changer({ ...processus, personnes });
          }}
        />
        <InterrupteurDeSaison
          frequence={processus.frequence}
          sansSaison={(saisie.hypotheses.semainesDePointe ?? 0) === 0}
          modifier={(frequence) => {
            changer({ ...processus, frequence });
          }}
        />
        <label className="interrupteur">
          <input
            type="checkbox"
            checked={processus.abandonne === true}
            onChange={(evenement) => {
              changer(avecAbandon(processus, evenement.target.checked));
            }}
          />
          N’est plus faite aujourd’hui
        </label>
      </Section>

      <Section titre="③ Avec quoi">
        <ChampsDOutil
          titre="Outil source"
          outil={processus.profil.source}
          erreur={champ('profil.source')}
          cites={cites}
          modifier={(source) => {
            profil({ source });
          }}
        />
        <ChampsDOutil
          titre="Outil cible"
          outil={processus.profil.cible}
          erreur={champ('profil.cible')}
          cites={cites}
          modifier={(cible) => {
            profil({ cible });
          }}
        />
      </Section>

      <Section titre="④ Comment">
        <ChampDeChoix
          libelle="Nature de la tâche"
          valeur={processus.profil.nature}
          choix={CHOIX_DES_NATURES}
          modifier={(nature) => {
            profil({ nature });
          }}
        />
        <ChampDeChoix
          libelle="Données"
          valeur={processus.profil.donnees}
          choix={CHOIX_DES_DONNEES}
          modifier={(donnees) => {
            profil({ donnees });
          }}
        />
        <ChampDeChoix
          libelle="Décision humaine"
          valeur={processus.profil.decisionHumaine}
          choix={CHOIX_DES_DECISIONS}
          modifier={(decisionHumaine) => {
            profil({ decisionHumaine });
          }}
        />
      </Section>

      <Section titre="⑤ Coût">
        <ChampDeChoix
          libelle="Coût horaire"
          valeur={coutHoraire.kind}
          choix={[
            ['Direct', 'Saisi directement'],
            ['DepuisSalaireBrutAnnuel', 'Déduit du salaire brut'],
          ]}
          modifier={(kind) => {
            changer({
              ...processus,
              coutHoraire:
                kind === 'Direct' ? COUT_DIRECT_PAR_DEFAUT : COUT_DEPUIS_SALAIRE_PAR_DEFAUT,
            });
          }}
        />
        {coutHoraire.kind === 'Direct' ? (
          <ChampNumerique
            libelle="Coût chargé d’une heure"
            unite="€/h"
            valeur={coutHoraire.centimesParHeure / 100}
            erreur={champ('coutHoraire')}
            modifier={(euros) => {
              changer({
                ...processus,
                coutHoraire: { kind: 'Direct', centimesParHeure: Math.round(euros * 100) },
              });
            }}
          />
        ) : (
          <>
            <ChampNumerique
              libelle="Salaire brut annuel"
              unite="€"
              valeur={coutHoraire.brutAnnuelEnCentimes / 100}
              erreur={champ('coutHoraire')}
              modifier={(euros) => {
                changer({
                  ...processus,
                  coutHoraire: { ...coutHoraire, brutAnnuelEnCentimes: Math.round(euros * 100) },
                });
              }}
            />
            <ChampNumerique
              libelle="Coefficient de charges"
              valeur={coutHoraire.coefficientDeCharges / 100}
              modifier={(coefficient) => {
                changer({
                  ...processus,
                  coutHoraire: {
                    ...coutHoraire,
                    coefficientDeCharges: Math.round(coefficient * 100),
                  },
                });
              }}
            />
          </>
        )}
      </Section>

      <Section titre="⑥ Taux d’automatisation">
        <ChampNumerique
          libelle="Taux bas (prudent)"
          unite="%"
          valeur={processus.tauxBas}
          erreur={champ('tauxBas')}
          modifier={(tauxBas) => {
            changer({ ...processus, tauxBas });
          }}
        />
        <ChampNumerique
          libelle="Taux haut (optimiste)"
          unite="%"
          valeur={processus.tauxHaut}
          erreur={champ('tauxHaut')}
          modifier={(tauxHaut) => {
            changer({ ...processus, tauxHaut });
          }}
        />
        {suggestion.ok ? (
          <p className="suggestion">
            Suggéré : {LIBELLES_DES_NIVEAUX[suggestion.value.niveau]}, {suggestion.value.tauxBas} à{' '}
            {suggestion.value.tauxHaut} %.{' '}
            {(processus.tauxBas !== suggestion.value.tauxBas ||
              processus.tauxHaut !== suggestion.value.tauxHaut) && (
              <button
                type="button"
                onClick={() => {
                  modifier({
                    ...processus,
                    tauxBas: suggestion.value.tauxBas,
                    tauxHaut: suggestion.value.tauxHaut,
                  });
                }}
              >
                Appliquer la suggestion
              </button>
            )}
          </p>
        ) : (
          <p className="suggestion">Renseignez les deux outils pour obtenir une suggestion.</p>
        )}
      </Section>

      <div className="actions-du-processus">
        {suppressionDemandee ? (
          <button type="button" onClick={supprimer}>
            Confirmer la suppression
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSuppressionDemandee(true);
            }}
          >
            Supprimer ce processus
          </button>
        )}
      </div>
    </form>
  );
};
