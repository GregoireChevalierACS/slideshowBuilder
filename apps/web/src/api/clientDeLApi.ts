import {
  schemaDeDiagnosticPublie,
  schemaDeResumeDeDiagnostic,
  type ModificationsDuDiagnostic,
  type SaisieDeDiagnostic,
} from '@slideshow/application';
import { err, ok, type Result } from '@slideshow/domain';
import { z } from 'zod';

const schemaDeProbleme = z.looseObject({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().exactOptional(),
  champ: z.string().exactOptional(),
  versionActuelle: z.number().exactOptional(),
});

export type Probleme = z.infer<typeof schemaDeProbleme>;
export type ResumeDeDiagnostic = z.infer<typeof schemaDeResumeDeDiagnostic>;
export interface DiagnosticPublie {
  readonly id: string;
  readonly version: number;
  readonly saisie: SaisieDeDiagnostic;
}

export type ErreurDApi =
  /** Le serveur a signalé un problème (Problem Details) : 400, 404, 409, 422… */
  | { readonly kind: 'Probleme'; readonly probleme: Probleme }
  /** Le serveur ne répond pas : arrêté, ou la machine est en veille. */
  | { readonly kind: 'Injoignable' }
  /** Le serveur a répondu hors contrat : versions incompatibles de l'interface et du serveur. */
  | { readonly kind: 'ReponseInattendue'; readonly statut: number };

type Appel = (url: string, options?: RequestInit) => Promise<Response>;

const enJson = (methode: 'POST' | 'PUT', corps: unknown): RequestInit => ({
  method: methode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(corps),
});

/** Client de l'API locale. Chaque réponse est validée par le contrat d'échange avant usage. */
export const creerLeClientDeLApi = (appel: Appel = (url, options) => fetch(url, options)) => {
  const demander = async <T>(
    schema: z.ZodType<T>,
    url: string,
    options?: RequestInit,
  ): Promise<Result<T, ErreurDApi>> => {
    let reponse: Response;
    try {
      reponse = await appel(url, options);
    } catch {
      return err({ kind: 'Injoignable' });
    }
    const corps: unknown = await reponse.json().catch(() => undefined);
    const inattendue = err({ kind: 'ReponseInattendue', statut: reponse.status } as const);

    if (reponse.ok) {
      const lu = schema.safeParse(corps);
      return lu.success ? ok(lu.data) : inattendue;
    }
    const probleme = schemaDeProbleme.safeParse(corps);
    return probleme.success ? err({ kind: 'Probleme', probleme: probleme.data }) : inattendue;
  };

  const urlDuDiagnostic = (id: string) => `/api/diagnostics/${encodeURIComponent(id)}`;

  return {
    listerLesDiagnostics: () => demander(z.array(schemaDeResumeDeDiagnostic), '/api/diagnostics'),

    ouvrirUnDiagnostic: (
      prospect: SaisieDeDiagnostic['prospect'],
    ): Promise<Result<DiagnosticPublie, ErreurDApi>> =>
      demander(schemaDeDiagnosticPublie, '/api/diagnostics', enJson('POST', prospect)),

    consulterUnDiagnostic: (
      id: string,
      version?: number,
    ): Promise<Result<DiagnosticPublie, ErreurDApi>> =>
      demander(
        schemaDeDiagnosticPublie,
        version === undefined
          ? urlDuDiagnostic(id)
          : `${urlDuDiagnostic(id)}?version=${String(version)}`,
      ),

    reviserUnDiagnostic: (
      id: string,
      versionAttendue: number,
      modifications: ModificationsDuDiagnostic,
    ): Promise<Result<DiagnosticPublie, ErreurDApi>> =>
      demander(
        schemaDeDiagnosticPublie,
        urlDuDiagnostic(id),
        enJson('PUT', { versionAttendue, ...modifications }),
      ),
  };
};

export type ClientDeLApi = ReturnType<typeof creerLeClientDeLApi>;
