import { describe, expect, it } from 'vitest';
import { lireLaConfiguration } from './configuration.js';

describe('lireLaConfiguration', () => {
  it('propose des valeurs par défaut pour un démarrage sans configuration', () => {
    expect(lireLaConfiguration({})).toStrictEqual({
      ok: true,
      value: { port: 4321, cheminDeLaBase: 'data/diagnostics.sqlite' },
    });
  });

  it('lit les variables fournies', () => {
    expect(
      lireLaConfiguration({ PORT: '8080', CHEMIN_DE_LA_BASE: 'C:/donnees/base.sqlite' }),
    ).toStrictEqual({
      ok: true,
      value: { port: 8080, cheminDeLaBase: 'C:/donnees/base.sqlite' },
    });
  });

  it('liste toutes les erreurs d’un coup, sans afficher les valeurs reçues', () => {
    const resultat = lireLaConfiguration({ PORT: 'secret-99999', CHEMIN_DE_LA_BASE: '' });

    expect(resultat).toStrictEqual({
      ok: false,
      error: [
        'PORT : entier entre 1 et 65535 attendu',
        'CHEMIN_DE_LA_BASE : chemin non vide attendu',
      ],
    });
    expect(JSON.stringify(resultat)).not.toContain('secret');
  });

  it.each(['0', '65536', '80.5'])('refuse le port %s', (PORT) => {
    expect(lireLaConfiguration({ PORT }).ok).toBe(false);
  });
});
