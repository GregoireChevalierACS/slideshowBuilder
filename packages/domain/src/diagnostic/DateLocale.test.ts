import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DateLocale } from './DateLocale.js';

describe('DateLocale', () => {
  it('se crée depuis une date ISO', () => {
    const date = DateLocale.depuisIso('2026-10-26');

    expect(date.ok && date.value.iso).toBe('2026-10-26');
  });

  it('expose l’année, le mois et le jour', () => {
    expect(DateLocale.depuisIso('2026-03-09')).toMatchObject({
      ok: true,
      value: { annee: 2026, mois: 3, jour: 9 },
    });
  });

  it.each(['2026-02-28', '2024-02-29', '2000-02-29', '2026-12-31', '2026-04-30'])(
    'accepte %s',
    (iso) => {
      expect(DateLocale.depuisIso(iso).ok).toBe(true);
    },
  );

  it.each([
    '2026-02-29', // 2026 n'est pas bissextile
    '1900-02-29', // divisible par 100 sans l'être par 400
    '2026-02-30',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-10-00',
    '2026-10-32',
    '26-10-2026',
    '2026-1-5',
    ' 2026-10-26',
    '2026-10-26T10:00',
    'xx-1910-10-05', // lu par position, donnerait un mois et un jour valides mais une année NaN
    '',
  ])('refuse %s', (iso) => {
    expect(DateLocale.depuisIso(iso)).toStrictEqual({
      ok: false,
      error: { kind: 'DateInvalide', valeur: iso },
    });
  });

  it('se formate en français pour une diapositive', () => {
    const date = DateLocale.depuisIso('2026-03-01');

    expect(date.ok && date.value.enToutesLettres).toBe('1er mars 2026');
  });

  it.each([
    ['2026-01-15', '15 janvier 2026'],
    ['2026-02-15', '15 février 2026'],
    ['2026-04-15', '15 avril 2026'],
    ['2026-05-15', '15 mai 2026'],
    ['2026-06-15', '15 juin 2026'],
    ['2026-07-15', '15 juillet 2026'],
    ['2026-08-15', '15 août 2026'],
    ['2026-09-15', '15 septembre 2026'],
    ['2026-10-26', '26 octobre 2026'],
    ['2026-11-15', '15 novembre 2026'],
    ['2026-12-15', '15 décembre 2026'],
  ])('%s s’écrit « %s »', (iso, attendu) => {
    const date = DateLocale.depuisIso(iso);

    expect(date.ok && date.value.enToutesLettres).toBe(attendu);
  });

  it('accepte exactement les dates que le calendrier grégorien connaît', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1900-01-01'), max: new Date('2199-12-31'), noInvalidDate: true }),
        (d) => {
          const iso = d.toISOString().slice(0, 10);
          const date = DateLocale.depuisIso(iso);
          return date.ok && date.value.iso === iso;
        },
      ),
    );
  });
});
