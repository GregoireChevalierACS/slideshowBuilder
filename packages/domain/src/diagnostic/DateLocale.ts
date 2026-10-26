import { err, ok, type Result } from '../Result.js';

export interface DateInvalide {
  readonly kind: 'DateInvalide';
  readonly valeur: string;
}

type Mois = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const NOMS_DES_MOIS: Readonly<Record<Mois, string>> = {
  1: 'janvier',
  2: 'février',
  3: 'mars',
  4: 'avril',
  5: 'mai',
  6: 'juin',
  7: 'juillet',
  8: 'août',
  9: 'septembre',
  10: 'octobre',
  11: 'novembre',
  12: 'décembre',
};

const FORMAT_ISO = /^\d{4}-\d{2}-\d{2}$/;

const estUnMois = (n: number): n is Mois => n >= 1 && n <= 12;

const estBissextile = (annee: number): boolean =>
  (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;

const joursDansLeMois = (annee: number, mois: Mois): number => {
  if (mois === 2) return estBissextile(annee) ? 29 : 28;
  return [4, 6, 9, 11].includes(mois) ? 30 : 31;
};

/**
 * Date de calendrier, sans heure ni fuseau : un entretien a lieu « le 26 octobre », quel que soit
 * le fuseau de la machine. Construite sans `new Date()`, interdit dans le domaine.
 */
export class DateLocale {
  private constructor(
    readonly annee: number,
    readonly mois: Mois,
    readonly jour: number,
  ) {}

  static depuisIso(iso: string): Result<DateLocale, DateInvalide> {
    if (!FORMAT_ISO.test(iso)) return err({ kind: 'DateInvalide', valeur: iso });
    // Le format est garanti : lecture par position, chiffres seulement.
    const annee = Number(iso.slice(0, 4));
    const mois = Number(iso.slice(5, 7));
    const jour = Number(iso.slice(8, 10));
    if (!estUnMois(mois) || jour < 1 || jour > joursDansLeMois(annee, mois)) {
      return err({ kind: 'DateInvalide', valeur: iso });
    }
    return ok(new DateLocale(annee, mois, jour));
  }

  get iso(): string {
    const deuxChiffres = (n: number) => String(n).padStart(2, '0');
    return `${String(this.annee)}-${deuxChiffres(this.mois)}-${deuxChiffres(this.jour)}`;
  }

  /** « 1er mars 2026 », « 26 octobre 2026 ». */
  get enToutesLettres(): string {
    const jour = this.jour === 1 ? '1er' : String(this.jour);
    return `${jour} ${NOMS_DES_MOIS[this.mois]} ${String(this.annee)}`;
  }
}
