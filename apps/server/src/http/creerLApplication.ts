import {
  decrireLeDiagnostic,
  lireUnIdDeDiagnostic,
  schemaDeProspect,
  schemaDeRevision,
  schemaDesParametresDuDeck,
  schemaDeVersion,
  type CasDUsage,
  type IdDeDiagnostic,
} from '@slideshow/application';
import type { Diagnostic } from '@slideshow/domain';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  corpsIllisible,
  diagnosticIntrouvable,
  envoyer,
  erreurInterne,
  hoteRefuse,
  requeteInvalide,
  routeInconnue,
  saisieInvalide,
  versionPerimee,
} from './problemes.js';

/** Contre le DNS rebinding : une page web ne peut pas viser ce serveur sous un autre nom. */
const HOTES_AUTORISES = new Set(['127.0.0.1', 'localhost']);

const parametresDeRoute = z.object({ id: z.string() });

const enReponse = (id: IdDeDiagnostic, diagnostic: Diagnostic) => ({
  id,
  version: diagnostic.version,
  saisie: decrireLeDiagnostic(diagnostic),
});

/**
 * L'application HTTP, identique en production et dans les tests : seuls les cas d'usage injectés
 * changent (ADR 0007).
 */
export const creerLApplication = (
  casDUsage: CasDUsage,
  options: {
    readonly journalisation?: boolean;
    /** L'interface compilée (apps/web/dist), servie à la racine : un seul port en production. */
    readonly dossierDeLInterface?: string;
  } = {},
): FastifyInstance => {
  const app = Fastify({ logger: options.journalisation ?? false });
  if (options.dossierDeLInterface !== undefined) {
    void app.register(fastifyStatic, { root: options.dossierDeLInterface });
  }

  app.addHook('onRequest', async (requete, reponse) => {
    if (!HOTES_AUTORISES.has(requete.hostname)) return envoyer(reponse, hoteRefuse());
  });

  app.setNotFoundHandler((requete, reponse) =>
    envoyer(reponse, routeInconnue(requete.method, requete.url)),
  );

  app.setErrorHandler((erreur, requete, reponse) => {
    // Erreurs de Fastify avant nos routes (JSON illisible, mauvais type de contenu) : 400.
    const { statusCode } = z
      .looseObject({ statusCode: z.number().optional() })
      .catch({})
      .parse(erreur);
    if (statusCode !== undefined && statusCode < 500) return envoyer(reponse, corpsIllisible());
    requete.log.error(erreur);
    return envoyer(reponse, erreurInterne());
  });

  /** Lit l'identifiant de l'URL ; un identifiant mal formé ne peut désigner aucun diagnostic. */
  const avecUnId = (
    params: unknown,
    reponse: FastifyReply,
    suite: (id: IdDeDiagnostic) => FastifyReply,
  ): FastifyReply => {
    const { id: texte } = parametresDeRoute.parse(params);
    const id = lireUnIdDeDiagnostic(texte);
    return id.ok ? suite(id.value) : envoyer(reponse, diagnosticIntrouvable({ id: texte }));
  };

  app.get('/api/diagnostics', (_requete, reponse) =>
    reponse.send(casDUsage.listerLesDiagnostics()),
  );

  app.post('/api/diagnostics', (requete, reponse) => {
    const prospect = schemaDeProspect.safeParse(requete.body);
    if (!prospect.success) return envoyer(reponse, requeteInvalide(prospect.error.issues));

    const ouvert = casDUsage.ouvrirUnDiagnostic(prospect.data);
    if (!ouvert.ok) return envoyer(reponse, saisieInvalide(ouvert.error));
    return reponse
      .code(201)
      .header('location', `/api/diagnostics/${ouvert.value.id}`)
      .send(enReponse(ouvert.value.id, ouvert.value.diagnostic));
  });

  app.get('/api/diagnostics/:id', (requete, reponse) => {
    const requise = schemaDeVersion.safeParse(requete.query);
    if (!requise.success) return envoyer(reponse, requeteInvalide(requise.error.issues));

    return avecUnId(requete.params, reponse, (id) => {
      const diagnostic = casDUsage.consulterUnDiagnostic(id, requise.data.version);
      if (!diagnostic.ok) return envoyer(reponse, diagnosticIntrouvable(diagnostic.error));
      return reponse.send(enReponse(id, diagnostic.value));
    });
  });

  app.put('/api/diagnostics/:id', (requete, reponse) => {
    const revision = schemaDeRevision.safeParse(requete.body);
    if (!revision.success) return envoyer(reponse, requeteInvalide(revision.error.issues));
    const { versionAttendue, ...modifications } = revision.data;

    return avecUnId(requete.params, reponse, (id) => {
      const revise = casDUsage.reviserUnDiagnostic(id, versionAttendue, modifications);
      if (revise.ok) return reponse.send(enReponse(id, revise.value));
      switch (revise.error.kind) {
        case 'DiagnosticIntrouvable':
          return envoyer(reponse, diagnosticIntrouvable(revise.error));
        case 'VersionPerimee':
          return envoyer(reponse, versionPerimee(revise.error));
        case 'SaisieInvalide':
          return envoyer(reponse, saisieInvalide(revise.error));
      }
    });
  });

  app.get('/api/diagnostics/:id/deck', (requete, reponse) => {
    const parametres = schemaDesParametresDuDeck.safeParse(requete.query);
    if (!parametres.success) return envoyer(reponse, requeteInvalide(parametres.error.issues));
    const { version, ...duDeck } = parametres.data;

    return avecUnId(requete.params, reponse, (id) => {
      const deck = casDUsage.genererLeDeck(id, duDeck, version);
      if (!deck.ok) return envoyer(reponse, diagnosticIntrouvable(deck.error));
      return reponse.send({ id, diapositives: deck.value });
    });
  });

  return app;
};
