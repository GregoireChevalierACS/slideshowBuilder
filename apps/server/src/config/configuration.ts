import { err, ok, type Result } from '@slideshow/domain';
import { z } from 'zod';

export interface Configuration {
  readonly port: number;
  readonly cheminDeLaBase: string;
}

/** L'adresse d'écoute n'est pas configurable : les données des prospects ne quittent pas la machine. */
export const HOTE = '127.0.0.1';

// Les messages sont écrits ici, sans jamais reprendre la valeur reçue (qui pourrait être un secret).
const schema = z.object({
  PORT: z.coerce
    .number({ error: 'entier entre 1 et 65535 attendu' })
    .int({ error: 'entier entre 1 et 65535 attendu' })
    .min(1, { error: 'entier entre 1 et 65535 attendu' })
    .max(65_535, { error: 'entier entre 1 et 65535 attendu' })
    .default(4321),
  CHEMIN_DE_LA_BASE: z
    .string()
    .min(1, { error: 'chemin non vide attendu' })
    .default('data/diagnostics.sqlite'),
});

/**
 * Valide toute la configuration au démarrage : une erreur empêche le serveur de démarrer au lieu
 * d'apparaître à la première requête.
 */
export const lireLaConfiguration = (
  environnement: Readonly<Record<string, string | undefined>>,
): Result<Configuration, readonly string[]> => {
  const lue = schema.safeParse(environnement);
  if (!lue.success) {
    return err(lue.error.issues.map((issue) => `${issue.path.join('.')} : ${issue.message}`));
  }
  return ok({ port: lue.data.PORT, cheminDeLaBase: lue.data.CHEMIN_DE_LA_BASE });
};
