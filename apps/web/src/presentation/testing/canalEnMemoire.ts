import type { Canal, MessageDePresentation, OuvrirUnCanal } from '../canal.js';

/**
 * Fake du canal : toutes les fenêtres ouvertes sur un même diagnostic partagent un bus en mémoire,
 * et, comme BroadcastChannel, l'émetteur ne reçoit pas ses propres messages.
 */
export const unBusEnMemoire = () => {
  const abonnes = new Map<string, Set<{ recevoir: (m: MessageDePresentation) => void }>>();
  const envoyes: MessageDePresentation[] = [];

  const ouvrir: OuvrirUnCanal = (id): Canal => {
    const ecoutes = new Set<{ recevoir: (m: MessageDePresentation) => void }>();
    const tous = abonnes.get(id) ?? new Set();
    abonnes.set(id, tous);
    return {
      envoyer: (message) => {
        envoyes.push(message);
        for (const abonne of tous) if (!ecoutes.has(abonne)) abonne.recevoir(message);
      },
      ecouter: (recevoir) => {
        const abonne = { recevoir };
        ecoutes.add(abonne);
        tous.add(abonne);
        return () => {
          ecoutes.delete(abonne);
          tous.delete(abonne);
        };
      },
      fermer: () => {
        for (const abonne of ecoutes) tous.delete(abonne);
      },
    };
  };

  /** Un message reçu par toutes les fenêtres du diagnostic, comme envoyé par une autre fenêtre. */
  const diffuser = (id: string, message: MessageDePresentation) => {
    for (const abonne of abonnes.get(id) ?? []) abonne.recevoir(message);
  };

  return { ouvrir, envoyes, diffuser };
};
