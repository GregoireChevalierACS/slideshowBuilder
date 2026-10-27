import {
  lireUnIdDeDiagnostic,
  type GenerateurDIdentifiants,
  type Horloge,
  type IdDeDiagnostic,
} from '@slideshow/application';
import { DateLocale } from '@slideshow/domain';
import { randomUUID } from 'node:crypto';

const deuxChiffres = (n: number) => String(n).padStart(2, '0');

/** Date du jour selon le fuseau de la machine : c'est le jour de l'entretien vécu par l'utilisateur. */
export class HorlogeSysteme implements Horloge {
  constructor(private readonly maintenant: () => Date = () => new Date()) {}

  aujourdhui(): DateLocale {
    const instant = this.maintenant();
    const iso = `${String(instant.getFullYear())}-${deuxChiffres(instant.getMonth() + 1)}-${deuxChiffres(instant.getDate())}`;
    const date = DateLocale.depuisIso(iso);
    if (!date.ok) throw new Error(`Horloge système invalide : ${iso}`);
    return date.value;
  }
}

export class GenerateurUuid implements GenerateurDIdentifiants {
  constructor(private readonly tirer: () => string = randomUUID) {}

  nouvelIdentifiant(): IdDeDiagnostic {
    const tire = this.tirer();
    const id = lireUnIdDeDiagnostic(tire);
    if (!id.ok) throw new Error(`Identifiant généré invalide : ${tire}`);
    return id.value;
  }
}
