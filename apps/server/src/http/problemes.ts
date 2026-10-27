import type {
  DiagnosticIntrouvable,
  SaisieInvalide,
  VersionIntrouvable,
  VersionPerimee,
} from '@slideshow/application';
import type { FastifyReply } from 'fastify';
import type { z } from 'zod';

// Erreurs au format Problem Details (RFC 9457). Le `type` est stable et testable par un client ;
// le `detail` est destiné à un humain et peut changer. Catalogue : docs/problemes.md.

export interface Probleme {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly [extension: string]: unknown;
}

export const envoyer = (reponse: FastifyReply, probleme: Probleme): FastifyReply =>
  reponse
    .code(probleme.status)
    .header('content-type', 'application/problem+json; charset=utf-8')
    .send(probleme);

export const requeteInvalide = (erreurs: readonly z.core.$ZodIssue[]): Probleme => ({
  type: '/problemes/requete-invalide',
  title: 'Requête invalide',
  status: 400,
  erreurs: erreurs.map((issue) => ({ chemin: issue.path.join('.'), message: issue.message })),
});

export const corpsIllisible = (): Probleme => ({
  type: '/problemes/requete-invalide',
  title: 'Requête invalide',
  status: 400,
  detail: 'Le corps de la requête est illisible.',
});

export const saisieInvalide = ({ champ, erreur }: SaisieInvalide): Probleme => ({
  type: '/problemes/saisie-invalide',
  title: 'Saisie invalide',
  status: 422,
  detail: `Le champ « ${champ} » est refusé : ${erreur.kind}.`,
  champ,
  erreur,
});

export const diagnosticIntrouvable = (
  erreur: DiagnosticIntrouvable | VersionIntrouvable | { readonly id: string },
): Probleme => ({
  type: '/problemes/diagnostic-introuvable',
  title: 'Diagnostic introuvable',
  status: 404,
  detail:
    'version' in erreur
      ? `Le diagnostic « ${erreur.id} » n’a pas de version ${String(erreur.version)}.`
      : `Aucun diagnostic « ${erreur.id} ».`,
});

export const versionPerimee = ({ versionAttendue, versionActuelle }: VersionPerimee): Probleme => ({
  type: '/problemes/version-perimee',
  title: 'Version périmée',
  status: 409,
  detail: `La version ${String(versionAttendue)} n’est plus la dernière : recharger la version ${String(versionActuelle)} avant de réviser.`,
  versionActuelle,
});

export const hoteRefuse = (): Probleme => ({
  type: '/problemes/hote-refuse',
  title: 'Hôte refusé',
  status: 403,
  detail: 'Ce serveur ne répond qu’aux requêtes adressées à cette machine.',
});

export const routeInconnue = (methode: string, url: string): Probleme => ({
  type: '/problemes/route-inconnue',
  title: 'Route inconnue',
  status: 404,
  detail: `${methode} ${url} n’existe pas.`,
});

export const erreurInterne = (): Probleme => ({
  type: '/problemes/erreur-interne',
  title: 'Erreur interne',
  status: 500,
});
