import { err, ok, type Result } from '../Result.js';

export type CategorieDOutil =
  | 'messagerie'
  | 'comptabilite'
  | 'facturation'
  | 'crm'
  | 'tableur'
  | 'stockage'
  | 'intranet'
  | 'messagerie-instantanee'
  | 'agenda'
  | 'banque'
  | 'autre';

/**
 * Comment un programme peut lire ou écrire dans l'outil. C'est ce qui décide du connecteur, et
 * donc de la fiabilité de l'automatisation.
 */
export type ModeDAcces = 'api' | 'webhook' | 'email' | 'export' | 'aucun';

export interface OutilInvalide {
  readonly kind: 'NomDOutilVide';
}

/** Un logiciel de l'infrastructure du client, relevé pendant l'entretien. */
export class Outil {
  private constructor(
    readonly nom: string,
    readonly categorie: CategorieDOutil,
    readonly acces: ModeDAcces,
  ) {}

  static creer(description: {
    readonly nom: string;
    readonly categorie: CategorieDOutil;
    readonly acces: ModeDAcces;
  }): Result<Outil, OutilInvalide> {
    const nom = description.nom.trim();
    if (nom === '') return err({ kind: 'NomDOutilVide' });
    return ok(new Outil(nom, description.categorie, description.acces));
  }

  /** Faux quand seule l'automatisation d'interface (RPA), fragile, permet d'y accéder. */
  get estIntegrable(): boolean {
    return this.acces !== 'aucun';
  }
}
