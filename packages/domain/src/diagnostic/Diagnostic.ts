import { err, ok, type Result } from '../Result.js';
import {
  concevoirArchitecture,
  type ArchitectureProposee,
} from '../conception/concevoirArchitecture.js';
import type { ProfilDAutomatisation } from '../conception/ProfilDAutomatisation.js';
import { estimerGains, type EstimationDeGains } from '../gains/estimerGains.js';
import type { HypothesesDeCalcul } from '../gains/HypothesesDeCalcul.js';
import type { ProcessusRedondant } from '../gains/ProcessusRedondant.js';
import type { DateLocale } from './DateLocale.js';
import type { Prospect } from './Prospect.js';

/** Un processus relevé : de quoi chiffrer ses gains et concevoir son automatisation. */
export interface ProcessusDuDiagnostic {
  readonly processus: ProcessusRedondant;
  readonly profil: ProfilDAutomatisation;
}

export interface DiagnosticInvalide {
  readonly kind: 'NomDeProcessusEnDouble';
  readonly nom: string;
}

interface ContenuDuDiagnostic {
  readonly prospect: Prospect;
  readonly dateDEntretien: DateLocale;
  readonly hypotheses: HypothesesDeCalcul;
  readonly processus: readonly ProcessusDuDiagnostic[];
}

/** Les noms servent de repères dans l'architecture : deux processus ne peuvent pas se confondre. */
const premierDoublon = (processus: readonly ProcessusDuDiagnostic[]): string | undefined => {
  const vus = new Set<string>();
  return processus
    .map(({ processus: p }) => p.nom)
    .find((nom) => {
      // Stryker disable next-line MethodExpression: mutant équivalent, passer en majuscules ou en minuscules donne la même comparaison insensible à la casse.
      const cle = nom.toLocaleLowerCase('fr');
      const dejaVu = vus.has(cle);
      vus.add(cle);
      return dejaVu;
    });
};

/**
 * Ce qui a été relevé chez un prospect. Immuable : chaque révision crée une nouvelle version, et
 * une présentation déjà envoyée reste reproductible à l'identique à partir de sa version.
 */
export class Diagnostic implements ContenuDuDiagnostic {
  readonly prospect: Prospect;
  readonly dateDEntretien: DateLocale;
  readonly hypotheses: HypothesesDeCalcul;
  readonly processus: readonly ProcessusDuDiagnostic[];

  private constructor(
    contenu: ContenuDuDiagnostic,
    readonly version: number,
  ) {
    this.prospect = contenu.prospect;
    this.dateDEntretien = contenu.dateDEntretien;
    this.hypotheses = contenu.hypotheses;
    this.processus = contenu.processus;
  }

  static creer(contenu: ContenuDuDiagnostic): Result<Diagnostic, DiagnosticInvalide> {
    return Diagnostic.valider(contenu, 1);
  }

  private static valider(
    contenu: ContenuDuDiagnostic,
    version: number,
  ): Result<Diagnostic, DiagnosticInvalide> {
    const doublon = premierDoublon(contenu.processus);
    if (doublon !== undefined) return err({ kind: 'NomDeProcessusEnDouble', nom: doublon });
    return ok(new Diagnostic(contenu, version));
  }

  /** La date de l'entretien ne se révise pas : c'est l'identité du diagnostic. */
  reviser(
    changements: Partial<Omit<ContenuDuDiagnostic, 'dateDEntretien'>>,
  ): Result<Diagnostic, DiagnosticInvalide> {
    return Diagnostic.valider({ ...this.contenu(), ...changements }, this.version + 1);
  }

  get estimation(): EstimationDeGains {
    return estimerGains(
      this.processus.map(({ processus }) => processus),
      this.hypotheses,
    );
  }

  get architecture(): ArchitectureProposee {
    return concevoirArchitecture(
      this.processus.map(({ processus, profil }) => ({ nom: processus.nom, profil })),
    );
  }

  private contenu(): ContenuDuDiagnostic {
    return {
      prospect: this.prospect,
      dateDEntretien: this.dateDEntretien,
      hypotheses: this.hypotheses,
      processus: this.processus,
    };
  }
}
