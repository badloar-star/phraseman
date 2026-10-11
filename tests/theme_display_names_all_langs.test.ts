// зачем (координатор 14.10): у восьми старых тем не было английского названия — англоязычный интерфейс падал на русское.
// Каждое название темы обязано иметь все 9 языков интерфейса; en не пустой.
import { THEME_DISPLAY_NAMES } from '../app/theme_display_names';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('названия тем на всех языках', () => {
  it('в каждой теме есть непустые названия на 9 языках', () => {
    const bad: string[] = [];
    for (const [id, names] of Object.entries(THEME_DISPLAY_NAMES)) {
      for (const lang of LANGS) {
        const value = (names as unknown as Record<string, unknown>)[lang];
        if (typeof value !== 'string' || value.trim().length === 0) bad.push(`${id}.${lang}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('английское название не совпадает по ошибке с русским (кроме совпадающих слов)', () => {
    const cyrillic = /[А-Яа-яЁё]/;
    for (const [id, names] of Object.entries(THEME_DISPLAY_NAMES)) {
      expect({ id, en: cyrillic.test(names.en) }).toEqual({ id, en: false });
    }
  });
});
