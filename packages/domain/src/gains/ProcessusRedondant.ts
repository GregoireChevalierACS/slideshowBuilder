import { err, ok, type Result } from '../Result.js';
import type { CoutHoraire } from './CoutHoraire.js';
import type { Duree } from './Duree.js';
import type { Effectif } from './Effectif.js';
import type { Frequence } from './Frequence.js';
import type { Pourcentage } from './Pourcentage.js';

export type ProcessusInvalide =
  | { readonly kind: 'NomDeProcessusVide' }
  | {
      readonly kind: 'TauxBasSuperieurAuTauxHaut';
      readonly tauxBas: number;
      readonly tauxHaut: number;
    };

export interface DescriptionDeProcessusRedondant {
  readonly nom: string;
  /** Temps d'une exécution de la tâche. */
  readonly dureeUnitaire: Duree;
  /** Par personne. */
  readonly frequence: Frequence;
  readonly effectif: Effectif;
  /** Part du temps que l'automatisation supprime, estimation prudente. */
  readonly tauxBas: Pourcentage;
  /** Part du temps que l'automatisation supprime, estimation optimiste. */
  readonly tauxHaut: Pourcentage;
  readonly coutHoraire: CoutHoraire;
  /**
   * La tâche n'est plus faite aujourd'hui (faute de temps) : son temps actuel vaut 0. L'automatiser
   * la remet en place ; c'est du travail rattrapé, pas du temps gagné. Faux par défaut.
   */
  readonly abandonne?: boolean;
}

/** Une tâche répétitive relevée pendant l'entretien, candidate à l'automatisation. */
export class ProcessusRedondant implements DescriptionDeProcessusRedondant {
  readonly nom: string;
  readonly dureeUnitaire: Duree;
  readonly frequence: Frequence;
  readonly effectif: Effectif;
  readonly tauxBas: Pourcentage;
  readonly tauxHaut: Pourcentage;
  readonly coutHoraire: CoutHoraire;
  readonly abandonne: boolean;

  private constructor(description: DescriptionDeProcessusRedondant) {
    this.nom = description.nom;
    this.dureeUnitaire = description.dureeUnitaire;
    this.frequence = description.frequence;
    this.effectif = description.effectif;
    this.tauxBas = description.tauxBas;
    this.tauxHaut = description.tauxHaut;
    this.coutHoraire = description.coutHoraire;
    this.abandonne = description.abandonne ?? false;
  }

  static creer(
    description: DescriptionDeProcessusRedondant,
  ): Result<ProcessusRedondant, ProcessusInvalide> {
    const nom = description.nom.trim();
    if (nom === '') return err({ kind: 'NomDeProcessusVide' });

    const { tauxBas, tauxHaut } = description;
    if (tauxBas.valeur > tauxHaut.valeur) {
      return err({
        kind: 'TauxBasSuperieurAuTauxHaut',
        tauxBas: tauxBas.valeur,
        tauxHaut: tauxHaut.valeur,
      });
    }

    return ok(new ProcessusRedondant({ ...description, nom }));
  }
}
