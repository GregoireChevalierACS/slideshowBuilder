import type { ErreurDApi } from './clientDeLApi.js';

/** Ce que l'utilisateur lit quand un appel échoue : la cause et, si possible, quoi faire. */
export const messageDErreur = (erreur: ErreurDApi): string => {
  switch (erreur.kind) {
    case 'Injoignable':
      return 'Le serveur ne répond pas. Vérifiez qu’il est démarré (pnpm start), puis réessayez.';
    case 'ReponseInattendue':
      return `Réponse inattendue du serveur (statut ${String(erreur.statut)}) : l’interface et le serveur ne sont peut-être pas à la même version.`;
    case 'Probleme':
      return erreur.probleme.detail ?? erreur.probleme.title;
  }
};
