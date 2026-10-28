import { describe, expect, it } from 'vitest';
import { messageDErreur } from './messageDErreur.js';

describe('messageDErreur', () => {
  it('explique un serveur injoignable et comment y remédier', () => {
    expect(messageDErreur({ kind: 'Injoignable' })).toContain('pnpm start');
  });

  it('évoque une incompatibilité de versions pour une réponse hors contrat', () => {
    expect(messageDErreur({ kind: 'ReponseInattendue', statut: 502 })).toBe(
      'Réponse inattendue du serveur (statut 502) : l’interface et le serveur ne sont peut-être pas à la même version.',
    );
  });

  it('reprend le détail du problème, ou à défaut son titre', () => {
    const probleme = { type: '/problemes/x', title: 'Titre', status: 404 };

    expect(messageDErreur({ kind: 'Probleme', probleme: { ...probleme, detail: 'Détail' } })).toBe(
      'Détail',
    );
    expect(messageDErreur({ kind: 'Probleme', probleme })).toBe('Titre');
  });
});
