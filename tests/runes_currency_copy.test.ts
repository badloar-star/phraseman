/**
 * Контракт валюты «руны» (переименование звёзд, владелец 22.08).
 * Реестр: docs/RUNES_RENAME_REGISTRY_2026-08-23.md
 */
import {
  RUNE_GLYPHS,
  RUNE_GLYPH_PRIMARY,
  pickRuneGlyphs,
  runeWord,
  runeAmount,
} from '../constants/runes';

describe('глифы рун', () => {
  it('это настоящие руны старшего футарка, без дублей', () => {
    expect(RUNE_GLYPHS.length).toBe(15);
    expect(new Set(RUNE_GLYPHS).size).toBe(RUNE_GLYPHS.length);
    for (const glyph of RUNE_GLYPHS) {
      const code = glyph.codePointAt(0)!;
      expect(code).toBeGreaterThanOrEqual(0x16a0); // блок Runic
      expect(code).toBeLessThanOrEqual(0x16ff);
    }
  });

  it('в статичных счётчиках всегда одна «дежурная» руна', () => {
    expect(RUNE_GLYPH_PRIMARY).toBe('ᚠ');
  });

  it('анимация начисления берёт РАЗНЫЕ глифы (требование владельца)', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const picked = pickRuneGlyphs(8);
      expect(picked.length).toBe(8);
      expect(new Set(picked).size).toBe(8); // ни одного повтора
    }
  });

  it('запрос больше футарка не падает и не теряет глифы', () => {
    const picked = pickRuneGlyphs(20);
    expect(picked.length).toBe(20);
    expect(new Set(picked.slice(0, 15)).size).toBe(15);
  });

  it('нулевой и отрицательный запрос даёт пустой список', () => {
    expect(pickRuneGlyphs(0)).toEqual([]);
    expect(pickRuneGlyphs(-3)).toEqual([]);
  });
});

describe('склонения слова «руна»', () => {
  it('русский: 1 руна / 2 руны / 5 рун', () => {
    expect(runeWord('ru', 1)).toBe('руна');
    expect(runeWord('ru', 2)).toBe('руны');
    expect(runeWord('ru', 4)).toBe('руны');
    expect(runeWord('ru', 5)).toBe('рун');
    expect(runeWord('ru', 0)).toBe('рун');
  });

  it('русский: 11–14 всегда «рун», а 21 — снова «руна»', () => {
    expect(runeWord('ru', 11)).toBe('рун');
    expect(runeWord('ru', 12)).toBe('рун');
    expect(runeWord('ru', 14)).toBe('рун');
    expect(runeWord('ru', 21)).toBe('руна');
    expect(runeWord('ru', 22)).toBe('руны');
    expect(runeWord('ru', 25)).toBe('рун');
    expect(runeWord('ru', 111)).toBe('рун');
  });

  it('украинский и польский тоже славянская тройка форм', () => {
    expect(runeWord('uk', 1)).toBe('руна');
    expect(runeWord('uk', 3)).toBe('руни');
    expect(runeWord('uk', 7)).toBe('рун');
    expect(runeWord('pl', 1)).toBe('runa');
    expect(runeWord('pl', 3)).toBe('runy');
    expect(runeWord('pl', 8)).toBe('run');
  });

  it('все восемь локалей имеют своё слово', () => {
    for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      expect(runeWord(lang, 1)).toBeTruthy();
      expect(runeWord(lang, 5)).toBeTruthy();
    }
    expect(runeWord('es', 1)).toBe('runa');
    expect(runeWord('es', 5)).toBe('runas');
    expect(runeWord('tr', 5)).toBe('rün');
  });

  it('неизвестный язык падает в русский, а не в пустую строку', () => {
    expect(runeWord('xx', 1)).toBe('руна');
  });

  it('runeAmount склеивает число со словом', () => {
    expect(runeAmount('ru', 1)).toBe('1 руна');
    expect(runeAmount('ru', 120)).toBe('120 рун');
    expect(runeAmount('es', 3)).toBe('3 runas');
  });
});
