import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '@slideshow/application/testing';
import { lireLaSaisie } from '@slideshow/application';
import { construireDeck, type Diapositive } from '@slideshow/domain';
import { describe, expect, it } from 'vitest';
import { decouper, LIGNES_PAR_PAGE, pagesDuDeck } from './pages.js';

const deckDe = (nombreDeProcessus: number, duree: 'courte' | 'complete' = 'complete') => {
  const lu = lireLaSaisie(
    uneSaisieDeDiagnostic({
      processus: Array.from({ length: nombreDeProcessus }, (_, i) =>
        uneSaisieDeProcessus({ nom: `Processus ${String(i + 1)}` }),
      ),
    }),
    1,
  );
  if (!lu.ok) throw new Error('saisie de test invalide');
  return construireDeck(lu.value, { public: 'technique', duree });
};

const genres = (pages: ReturnType<typeof pagesDuDeck>) =>
  pages.map(
    ({ diapositive, partie }) =>
      `${diapositive.kind}${partie === undefined ? '' : ` ${String(partie.numero)}/${String(partie.total)}`}`,
  );

describe('decouper', () => {
  it('découpe en morceaux de taille donnée', () => {
    expect(decouper([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]]);
  });

  it('rend toujours au moins un morceau, même vide', () => {
    expect(decouper([], 3)).toStrictEqual([[]]);
  });
});

describe('pagesDuDeck', () => {
  it('garde une diapositive par élément du deck quand tout tient', () => {
    const deck = deckDe(2);

    expect(pagesDuDeck(deck).map((p) => p.diapositive)).toStrictEqual(deck);
    expect(pagesDuDeck(deck).every((p) => p.partie === undefined)).toBe(true);
  });

  it('découpe les listes trop longues en plusieurs pages numérotées', () => {
    const pages = pagesDuDeck(deckDe(LIGNES_PAR_PAGE + 1));

    expect(genres(pages).filter((g) => g.startsWith('TableauDesProcessus'))).toStrictEqual([
      'TableauDesProcessus 1/2',
      'TableauDesProcessus 2/2',
    ]);
    expect(genres(pages).filter((g) => g.startsWith('GainsAttendus'))).toStrictEqual([
      'GainsAttendus 1/2',
      'GainsAttendus 2/2',
    ]);
    expect(genres(pages).filter((g) => g.startsWith('FeuilleDeRoute'))).toStrictEqual([
      'FeuilleDeRoute 1/2',
      'FeuilleDeRoute 2/2',
    ]);
    expect(genres(pages).filter((g) => g.startsWith('Hypotheses'))).toStrictEqual([
      'Hypotheses 1/2',
      'Hypotheses 2/2',
    ]);
    expect(genres(pages).filter((g) => g.startsWith('Observation'))).toStrictEqual(['Observation']);
  });

  it('répartit les lignes sans en perdre ni en dupliquer', () => {
    const pages = pagesDuDeck(deckDe(2 * LIGNES_PAR_PAGE + 3));
    const lignes = pages.flatMap(({ diapositive }) =>
      diapositive.kind === 'TableauDesProcessus'
        ? diapositive.lignes.map((l) => l.processus.nom)
        : [],
    );

    expect(lignes).toStrictEqual(
      Array.from({ length: 2 * LIGNES_PAR_PAGE + 3 }, (_, i) => `Processus ${String(i + 1)}`),
    );
  });

  it('découpe aussi une longue liste de processus observés', () => {
    const pages = pagesDuDeck(deckDe(3 * LIGNES_PAR_PAGE));
    const observation = pages.filter((p) => p.diapositive.kind === 'Observation');

    expect(observation.map((p) => p.partie)).toStrictEqual([
      { numero: 1, total: 2 },
      { numero: 2, total: 2 },
    ]);
  });

  it('ne touche pas aux diapositives sans liste', () => {
    const deck = deckDe(LIGNES_PAR_PAGE + 1, 'courte');
    const titre = deck.find(
      (d): d is Extract<Diapositive, { kind: 'Titre' }> => d.kind === 'Titre',
    );

    expect(pagesDuDeck(deck)[0]).toStrictEqual({ diapositive: titre, partie: undefined });
  });
});
