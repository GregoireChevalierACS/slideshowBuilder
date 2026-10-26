import { describe, expect, it } from 'vitest';
import { Outil } from './Outil.js';

describe('Outil', () => {
  it('décrit un logiciel du client, sa catégorie et la façon dont on peut y accéder', () => {
    expect(
      Outil.creer({ nom: 'Pennylane', categorie: 'comptabilite', acces: 'api' }),
    ).toMatchObject({
      ok: true,
      value: { nom: 'Pennylane', categorie: 'comptabilite', acces: 'api' },
    });
  });

  it('retire les espaces autour du nom', () => {
    const outil = Outil.creer({ nom: ' Outlook  ', categorie: 'messagerie', acces: 'email' });

    expect(outil.ok && outil.value.nom).toBe('Outlook');
  });

  it.each(['', '  '])('refuse un nom vide (« %s »)', (nom) => {
    expect(Outil.creer({ nom, categorie: 'tableur', acces: 'export' })).toStrictEqual({
      ok: false,
      error: { kind: 'NomDOutilVide' },
    });
  });

  it.each([
    ['api', true],
    ['webhook', true],
    ['email', true],
    ['export', true],
    ['aucun', false],
  ] as const)(
    'avec un accès « %s », est intégrable sans automatisation d’interface : %s',
    (acces, attendu) => {
      const outil = Outil.creer({ nom: 'Logiciel', categorie: 'autre', acces });

      expect(outil.ok && outil.value.estIntegrable).toBe(attendu);
    },
  );
});
