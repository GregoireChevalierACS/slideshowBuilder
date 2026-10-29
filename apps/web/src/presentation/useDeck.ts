import { lireLaSaisie } from '@slideshow/application';
import { construireDeck } from '@slideshow/domain';
import { useEffect, useState } from 'react';
import type { ClientDeLApi } from '../api/clientDeLApi.js';
import { messageDErreur } from '../api/messageDErreur.js';
import type { ReglagesDePresentation } from '../navigation.js';
import { pagesDuDeck, type Page } from './pages.js';

export type EtatDuDeck =
  | { readonly etat: 'chargement' }
  | { readonly etat: 'erreur'; readonly message: string }
  | {
      readonly etat: 'pret';
      readonly prospect: string;
      readonly pages: readonly Page[];
      /** La version présentée. */
      readonly version: number;
      /** La plus récente, pour proposer les précédentes. */
      readonly derniereVersion: number;
    };

/**
 * Le deck d'une version enregistrée, construit dans le navigateur par le domaine : une version
 * donnée produit toujours exactement le même deck, à l'écran comme en PDF.
 */
export const useDeck = (
  client: ClientDeLApi,
  id: string,
  { public: publicVise, duree, version }: ReglagesDePresentation,
): EtatDuDeck => {
  const [etat, setEtat] = useState<EtatDuDeck>({ etat: 'chargement' });

  useEffect(() => {
    let actif = true;
    const charger = async (): Promise<EtatDuDeck> => {
      const derniere = await client.consulterUnDiagnostic(id);
      if (!derniere.ok) return { etat: 'erreur', message: messageDErreur(derniere.error) };
      const demandee =
        version === undefined || version === derniere.value.version
          ? derniere
          : await client.consulterUnDiagnostic(id, version);
      if (!demandee.ok) return { etat: 'erreur', message: messageDErreur(demandee.error) };

      const diagnostic = lireLaSaisie(demandee.value.saisie, demandee.value.version);
      if (!diagnostic.ok) {
        return {
          etat: 'erreur',
          message: `Cette version ne peut pas être présentée : le champ « ${diagnostic.error.champ} » est à corriger.`,
        };
      }
      return {
        etat: 'pret',
        prospect: diagnostic.value.prospect.nom,
        pages: pagesDuDeck(construireDeck(diagnostic.value, { public: publicVise, duree })),
        version: demandee.value.version,
        derniereVersion: derniere.value.version,
      };
    };
    void charger().then((charge) => {
      // Les réglages ont changé pendant le chargement : seul le dernier résultat compte.
      if (actif) setEtat(charge);
    });
    return () => {
      actif = false;
    };
  }, [client, id, publicVise, duree, version]);

  return etat;
};
