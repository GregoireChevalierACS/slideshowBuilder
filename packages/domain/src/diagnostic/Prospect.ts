import { err, ok, type Result } from '../Result.js';
import type { Effectif } from '../gains/Effectif.js';

export interface ProspectInvalide {
  readonly kind: 'NomDeProspectVide';
}

/** L'entreprise démarchée. Seul le nom est indispensable pour commencer l'entretien. */
export class Prospect {
  private constructor(
    readonly nom: string,
    readonly secteur: string | undefined,
    readonly effectifTotal: Effectif | undefined,
  ) {}

  static creer(description: {
    readonly nom: string;
    readonly secteur?: string;
    readonly effectifTotal?: Effectif;
  }): Result<Prospect, ProspectInvalide> {
    const nom = description.nom.trim();
    if (nom === '') return err({ kind: 'NomDeProspectVide' });
    const secteur = description.secteur?.trim();
    return ok(new Prospect(nom, secteur === '' ? undefined : secteur, description.effectifTotal));
  }
}
