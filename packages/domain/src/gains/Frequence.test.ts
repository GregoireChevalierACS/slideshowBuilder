import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Frequence, type Periode } from './Frequence.js';
import { HypothesesDeCalcul } from './HypothesesDeCalcul.js';

const occurrencesParAn = (
  nombre: number,
  periode: Periode,
  hypotheses = HypothesesDeCalcul.parDefaut(),
) => {
  const frequence = Frequence.creer(nombre, periode);
  if (!frequence.ok) throw new Error(`fréquence de test invalide : ${frequence.error.kind}`);
  return frequence.value.occurrencesParAn(hypotheses);
};

describe('Frequence', () => {
  it('ramène une fréquence quotidienne aux jours travaillés', () => {
    expect(occurrencesParAn(20, 'jour')).toBe(20 * 228);
  });

  it('ramène une fréquence hebdomadaire aux semaines travaillées (jours travaillés / 5)', () => {
    expect(occurrencesParAn(15, 'semaine')).toBe(684);
  });

  it('ramène une fréquence mensuelle à 12 mois', () => {
    expect(occurrencesParAn(2, 'mois')).toBe(24);
  });

  it('garde une fréquence annuelle telle quelle', () => {
    expect(occurrencesParAn(3, 'an')).toBe(3);
  });

  it('suit les jours travaillés propres au client', () => {
    const hypotheses = HypothesesDeCalcul.creer({
      joursTravaillesParAn: 218,
      heuresAnnuellesTempsPlein: 1_607,
    });
    if (!hypotheses.ok) throw new Error('hypothèses de test invalides');

    expect(occurrencesParAn(1, 'jour', hypotheses.value)).toBe(218);
  });

  it('expose le nombre et la période saisis', () => {
    expect(Frequence.creer(4, 'semaine')).toMatchObject({
      ok: true,
      value: { nombre: 4, periode: 'semaine' },
    });
  });

  it.each([0, -2])('refuse %s fois', (nombre) => {
    expect(Frequence.creer(nombre, 'jour')).toStrictEqual({
      ok: false,
      error: { kind: 'FrequenceInferieureAUn', valeur: nombre },
    });
  });

  it.each([1.5, Number.NaN])('refuse %s fois', (nombre) => {
    expect(Frequence.creer(nombre, 'jour')).toStrictEqual({
      ok: false,
      error: { kind: 'FrequenceNonEntiere', valeur: nombre },
    });
  });

  it('cinq fois la même tâche par semaine équivaut à une fois par jour travaillé', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000 }), (nombre) => {
        return occurrencesParAn(nombre * 5, 'semaine') === occurrencesParAn(nombre, 'jour');
      }),
    );
  });
});
