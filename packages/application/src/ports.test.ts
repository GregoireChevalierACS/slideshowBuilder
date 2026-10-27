import { describe, expect, it } from 'vitest';
import { lireUnIdDeDiagnostic } from './ports.js';

describe('lireUnIdDeDiagnostic', () => {
  it.each(['d', 'diagnostic-1', '0b6f8a52-3c1e-4c7a-9a0e-2f1d5b7c9e10', 'A'.repeat(64)])(
    'accepte « %s »',
    (texte) => {
      expect(lireUnIdDeDiagnostic(texte)).toStrictEqual({ ok: true, value: texte });
    },
  );

  it.each(['', 'a b', '../etc/passwd', 'é', 'A'.repeat(65), 'x\n'])('refuse « %s »', (texte) => {
    expect(lireUnIdDeDiagnostic(texte)).toStrictEqual({
      ok: false,
      error: { kind: 'IdentifiantInvalide', valeur: texte },
    });
  });
});
