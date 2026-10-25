import { describe, expect, it } from 'vitest';
import { err, ok } from './Result.js';

describe('Result', () => {
  it('ok porte une valeur', () => {
    expect(ok(42)).toStrictEqual({ ok: true, value: 42 });
  });

  it('err porte une erreur', () => {
    expect(err({ kind: 'Invalide' })).toStrictEqual({ ok: false, error: { kind: 'Invalide' } });
  });
});
