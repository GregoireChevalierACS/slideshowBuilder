import { z } from 'zod';

// Synchronisation entre l'écran de présentation et la vue présentateur (une seconde fenêtre du
// même navigateur) : BroadcastChannel, sans serveur. Les messages reçus sont validés avant usage.

const schemaDeMessage = z.discriminatedUnion('type', [
  /** L'écran principal annonce la page affichée. */
  z.strictObject({ type: z.literal('page'), numero: z.number().int().nonnegative() }),
  /** La vue présentateur demande d'aller à une page. */
  z.strictObject({ type: z.literal('aller'), numero: z.number().int().nonnegative() }),
  /** La vue présentateur, à son ouverture, demande la page affichée. */
  z.strictObject({ type: z.literal('demande') }),
]);

export type MessageDePresentation = z.infer<typeof schemaDeMessage>;

export interface Canal {
  readonly envoyer: (message: MessageDePresentation) => void;
  /** Rend la fonction qui arrête l'écoute. */
  readonly ecouter: (recevoir: (message: MessageDePresentation) => void) => () => void;
  readonly fermer: () => void;
}

export type OuvrirUnCanal = (id: string) => Canal;

export const ouvrirLeCanal: OuvrirUnCanal = (id) => {
  const canal = new BroadcastChannel(`slideshow.presentation.${id}`);
  return {
    envoyer: (message) => {
      canal.postMessage(message);
    },
    ecouter: (recevoir) => {
      const surMessage = (evenement: MessageEvent<unknown>) => {
        const lu = schemaDeMessage.safeParse(evenement.data);
        if (lu.success) recevoir(lu.data);
      };
      canal.addEventListener('message', surMessage);
      return () => {
        canal.removeEventListener('message', surMessage);
      };
    },
    fermer: () => {
      canal.close();
    },
  };
};
