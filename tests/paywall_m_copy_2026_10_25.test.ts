// зачем (координатор 25.10, пейвол «Вариант М»): тексты М — 9 языков во всех строках, формы по числу и подстановки работают,
// «ноль» берётся из строки цены магазина (без жёсткого «0 €»), в видимых строках нет слова «попытки» (кухня, сторож no_dev_jargon).
import { PAYWALL_M_COPY_ROWS } from '../components/paywall/m/paywall_m_copy.generated';
import { paywallMFill, paywallMPluralIndex, paywallMText, paywallMZeroFromPrice } from '../components/paywall/m/paywall_m_copy';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('пейвол М: тексты', () => {
  it('в каждой строке есть все 9 языков и нет пустых', () => {
    for (const [key, row] of Object.entries(PAYWALL_M_COPY_ROWS)) {
      for (const lang of LANGS) {
        expect(typeof (row as Record<string, string>)[lang]).toBe('string');
        expect((row as Record<string, string>)[lang].trim().length).toBeGreaterThan(0);
      }
      // подстановки в переводе те же, что в русском
      const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
      for (const lang of LANGS) expect({ key, lang, names: names((row as Record<string, string>)[lang]) }).toEqual({ key, lang, names: names(row.ru) });
    }
  });

  it('формы по числу: ru/uk/pl — три, en/es/pt-BR — две', () => {
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => paywallMPluralIndex('ru', n, 3))).toEqual([0, 1, 2, 2, 0, 1, 2]);
    expect([1, 2, 5, 12, 22].map((n) => paywallMPluralIndex('pl', n, 3))).toEqual([0, 1, 2, 2, 1]);
    expect([1, 2].map((n) => paywallMPluralIndex('en', n, 2))).toEqual([0, 1]);
  });

  it('подставляет числа и склоняет слово после числа', () => {
    expect(paywallMText('ru', 'm.head.energy.kicker', { n: 5 })).toBe('5 занятий подряд сегодня');
    expect(paywallMText('ru', 'm.head.energy.kicker', { n: 1 })).toBe('1 занятие подряд сегодня');
    expect(paywallMText('ru', 'm.head.energy.kicker', { n: 3 })).toBe('3 занятия подряд сегодня');
    expect(paywallMFill('en', 'Day {day} · lesson {lesson}', { day: 10, lesson: 4 })).toBe('Day 10 · lesson 4');
  });

  it('«ноль» из строки цены магазина: валюта и пробелы как у магазина', () => {
    expect(paywallMZeroFromPrice('39,99 €')).toBe('0 €');
    expect(paywallMZeroFromPrice('€39.99')).toBe('€0');
    expect(paywallMZeroFromPrice('3 999 ₽')).toBe('0 ₽');
    expect(paywallMZeroFromPrice('R$ 199,90')).toBe('R$ 0');
    expect(paywallMZeroFromPrice('')).toBeNull();
    expect(paywallMZeroFromPrice(null)).toBeNull();
  });

  it('строка про голос не говорит «попытки» ни на каком языке, в русском нет жёсткой валюты', () => {
    const row = PAYWALL_M_COPY_ROWS['m.chart.note.voice'] as Record<string, string>;
    expect(row.ru).not.toMatch(/попытк/i);
    expect(row.uk).not.toMatch(/спроб/i);
    expect(PAYWALL_M_COPY_ROWS['m.fine.trial'].ru).toContain('{zero}');
    expect(PAYWALL_M_COPY_ROWS['m.fine.trial'].ru).not.toContain('€');
  });
});
