import { lireLaSaisie } from '@slideshow/application';
import { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from '@slideshow/application/testing';
import { construireDeck, type DiapositiveArchitecture } from '@slideshow/domain';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { disposerLeSchema, HAUTEUR_DU_SCHEMA, LARGEUR_DU_SCHEMA } from './schema.js';

const architecture = (
  nombreDOutils: number,
  publicVise: 'dirigeant' | 'technique' = 'technique',
): DiapositiveArchitecture => {
  const processus = Array.from({ length: Math.max(1, Math.ceil(nombreDOutils / 2)) }, (_, i) =>
    uneSaisieDeProcessus({
      nom: `P${String(i)}`,
      profil: {
        nature: i % 2 === 0 ? 'tri' : 'relance',
        source: { nom: `Source ${String(i)}`, categorie: 'messagerie', acces: 'email' },
        cible: { nom: `Cible ${String(i)}`, categorie: 'comptabilite', acces: 'api' },
        donnees: 'structurees',
        decisionHumaine: 'aucune',
      },
    }),
  );
  const lu = lireLaSaisie(uneSaisieDeDiagnostic({ processus }), 1);
  if (!lu.ok) throw new Error('saisie de test invalide');
  const diapositive = construireDeck(lu.value, { public: publicVise, duree: 'courte' }).find(
    (d): d is DiapositiveArchitecture => d.kind === 'Architecture',
  );
  if (diapositive === undefined) throw new Error('pas de diapositive d’architecture');
  return diapositive;
};

const seChevauchent = (a: { y: number; hauteur: number }, b: { y: number; hauteur: number }) =>
  a.y < b.y + b.hauteur && b.y < a.y + a.hauteur;

describe('disposerLeSchema', () => {
  it('place les outils du client à gauche, dans l’ordre', () => {
    const schema = disposerLeSchema(architecture(2));

    expect(schema.outils.map((o) => o.nom)).toStrictEqual(['Source 0', 'Cible 0']);
    expect(schema.outils.every((o) => o.x + o.largeur < (schema.familles[0]?.x ?? 0))).toBe(true);
  });

  it('montre les familles présentes dans l’ordre du flux, avec le détail des briques pour un public technique', () => {
    const schema = disposerLeSchema(architecture(4));

    expect(schema.familles.map((f) => f.libelle)).toStrictEqual([
      'Déclencheurs',
      'Connecteurs',
      'Traitements',
      'Contrôle',
    ]);
    expect(schema.familles.find((f) => f.libelle === 'Traitements')?.detail).toBe(
      'Classification par IA · Génération de documents',
    );
  });

  it('résume chaque famille par son nombre de briques pour un dirigeant', () => {
    const schema = disposerLeSchema(architecture(4, 'dirigeant'));

    expect(schema.familles.find((f) => f.libelle === 'Traitements')?.detail).toBe('2 briques');
    expect(schema.familles.find((f) => f.libelle === 'Déclencheurs')?.detail).toBe('2 briques');
    expect(schema.familles.find((f) => f.libelle === 'Contrôle')?.detail).toBe('2 briques');
  });

  it('accorde « brique » au singulier', () => {
    const schema = disposerLeSchema({
      ...architecture(2, 'dirigeant'),
      briques: architecture(2).briques.slice(0, 1),
    });

    expect(schema.familles[0]?.detail).toBe('1 brique');
  });

  it('signale les familles qui font appel à l’IA', () => {
    const schema = disposerLeSchema(architecture(2));

    expect(schema.familles.filter((f) => f.ia).map((f) => f.libelle)).toStrictEqual([
      'Traitements',
    ]);
  });

  it('relie chaque outil aux connecteurs', () => {
    const schema = disposerLeSchema(architecture(2));
    const connecteurs = schema.familles.find((f) => f.libelle === 'Connecteurs');

    expect(schema.liens).toHaveLength(2);
    for (const lien of schema.liens) expect(lien.x2).toBe(connecteurs?.x);
  });

  it('dessine un schéma vide sans outils ni briques', () => {
    expect(disposerLeSchema({ ...architecture(2), outils: [], briques: [] })).toMatchObject({
      outils: [],
      familles: [],
      liens: [],
    });
  });

  it('tient toujours dans le cadre, sans chevauchement, quel que soit le nombre d’outils', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 24 }), (nombre) => {
        const { outils, familles } = disposerLeSchema(architecture(nombre));
        const boites = [...outils, ...familles];
        const dansLeCadre = boites.every(
          (b) =>
            b.x >= 0 &&
            b.y >= 0 &&
            b.x + b.largeur <= LARGEUR_DU_SCHEMA &&
            b.y + b.hauteur <= HAUTEUR_DU_SCHEMA,
        );
        const sansChevauchement = [outils, familles].every((colonne) =>
          colonne.every((a, i) => colonne.every((b, j) => i === j || !seChevauchent(a, b))),
        );
        return dansLeCadre && sansChevauchement;
      }),
      { numRuns: 24 },
    );
  });
});
