/**
 * Règle métier composable (pattern Specification). Les règles de conception se lisent comme une
 * phrase et leur description sert telle quelle de justification devant le client : « l'outil
 * expose une API et les données sont structurées ».
 */
export interface Specification<T> {
  readonly description: string;
  estSatisfaitePar(candidat: T): boolean;
  et(autre: Specification<T>): Specification<T>;
  ou(autre: Specification<T>): Specification<T>;
  non(): Specification<T>;
}

class SpecificationComposable<T> implements Specification<T> {
  constructor(
    readonly description: string,
    private readonly predicat: (candidat: T) => boolean,
    /** Une conjonction ou une disjonction : à mettre entre parenthèses quand on la compose. */
    private readonly estComposee = false,
  ) {}

  estSatisfaitePar(candidat: T): boolean {
    return this.predicat(candidat);
  }

  et(autre: Specification<T>): Specification<T> {
    return new SpecificationComposable(
      `${enOperande(this)} et ${enOperande(autre)}`,
      (candidat) => this.estSatisfaitePar(candidat) && autre.estSatisfaitePar(candidat),
      true,
    );
  }

  ou(autre: Specification<T>): Specification<T> {
    return new SpecificationComposable(
      `${enOperande(this)} ou ${enOperande(autre)}`,
      (candidat) => this.estSatisfaitePar(candidat) || autre.estSatisfaitePar(candidat),
      true,
    );
  }

  non(): Specification<T> {
    return new SpecificationComposable(
      `non (${this.description})`,
      (candidat) => !this.estSatisfaitePar(candidat),
    );
  }

  static estComposee(specification: Specification<unknown>): boolean {
    return specification instanceof SpecificationComposable && specification.estComposee;
  }
}

const enOperande = <T>(specification: Specification<T>): string =>
  SpecificationComposable.estComposee(specification)
    ? `(${specification.description})`
    : specification.description;

export const specification = <T>(
  description: string,
  predicat: (candidat: T) => boolean,
): Specification<T> => new SpecificationComposable(description, predicat);
