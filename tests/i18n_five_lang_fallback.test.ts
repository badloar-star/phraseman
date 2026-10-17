import { bundleLang, legacyRuUk, THEORY_FALLBACK, theoryContentKey, theoryEntryFor, theoryEntryForMode, theoryHasOwnText, triLang } from '../constants/i18n';

// зачем (координатор 12.10, 🔴): pt-BR/vi/id/tr/pl видимы в выпуске, а словарь без их ключа отдавал РУССКИЙ (~2400 словарей,
// docs/phraseman-2.0/I18N_FALLBACK_5LANG_R1.md). Страховка: свой ключ → en → ru последним. ru/uk/es не меняются.
const FIVE = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('triLang fallback for pt-BR/vi/id/tr/pl', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { warn.mockRestore(); });

  it.each(FIVE)('%s: own key wins over en and ru', (lang) => {
    const dict = { ru: 'Рус', uk: 'Укр', en: 'Eng', es: 'Esp', 'pt-BR': 'PT', vi: 'VI', id: 'ID', tr: 'TR', pl: 'PL' };
    expect(triLang(lang, dict)).toBe(dict[lang]);
  });

  it.each(FIVE)('%s: no own key → English, not Russian', (lang) => {
    expect(triLang(lang, { ru: 'Сохранить', uk: 'Зберегти', en: 'Save', es: 'Guardar' })).toBe('Save');
  });

  it.each(FIVE)('%s: neither own key nor en → Russian stays the last resort', (lang) => {
    expect(triLang(lang, { ru: 'Только русский', uk: 'Тільки українська', es: 'Solo español' })).toBe('Только русский');
  });

  it('ru, uk and es are unchanged', () => {
    const dict = { ru: 'Рус', uk: 'Укр', en: 'Eng', es: 'Esp' };
    expect(triLang('ru', dict)).toBe('Рус');
    expect(triLang('uk', dict)).toBe('Укр');
    expect(triLang('es', dict)).toBe('Esp');
  });

  it('logs [I18N-FALLBACK] once per string and language, with the chosen target', () => {
    const dict = { ru: 'Уникальная строка страховки пяти языков', uk: 'Унікальний', en: 'Unique', es: 'Única' };
    triLang('pt-BR', dict);
    triLang('pt-BR', dict);
    triLang('vi', dict);
    const calls = warn.mock.calls.map((c) => String(c[0])).filter((line) => line.includes('[I18N-FALLBACK]') && line.includes('Уникальная строка страховки'));
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('lang=pt-BR→en');
    expect(calls[1]).toContain('lang=vi→en');
  });
});

// зачем (координатор 12.10, 🔴 для английского): теория уроков (hint.tsx, lesson_theory_v2.tsx) показывала кириллицу английскому интерфейсу
// и pt-BR/vi/id/tr/pl. В данных теории только ru/uk/es → для остальных es, ru последним; ru/uk/es без изменений.
describe('theoryContentKey', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { warn.mockRestore(); });

  it('ru, uk and es keep their own theory', () => {
    expect(theoryContentKey('ru', 'test')).toBe('ru');
    expect(theoryContentKey('uk', 'test')).toBe('uk');
    expect(theoryContentKey('es', 'test')).toBe('es');
  });

  it.each(['en', ...FIVE] as const)('%s gets Spanish theory, not Cyrillic', (lang) => {
    expect(theoryContentKey(lang, 'test')).toBe('es');
  });

  it('logs [I18N-FALLBACK] screen=theory once per screen and language', () => {
    let fresh!: typeof import('../constants/i18n');
    jest.isolateModules(() => { fresh = require('../constants/i18n'); });
    fresh.theoryContentKey('vi', 'hint');
    fresh.theoryContentKey('vi', 'hint');
    fresh.theoryContentKey('vi', 'lesson_theory_v2');
    const lines = warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('screen=theory'));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('lang=vi→es');
  });
});

// зачем (координатор 12.10): «Правила и объяснения» — английскому своей теории нет нигде → скрыт (режим 'hide', по умолчанию) или испанская
// (режим 'es'); pt-BR/vi/id/tr/pl — в lesson_help на их языке; ru/uk/es — прежний маршрут.
describe('theoryEntryFor / THEORY_FALLBACK', () => {
  beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  // зачем (координатор 17.10, «шпаргалки на английском — ДА»): в режиме hide English открывает 9-язычную шпаргалку /hint
  it('default mode is hide: English opens the 9-language cheat sheet, not the Spanish theory', () => {
    expect(THEORY_FALLBACK).toBe('hide');
    expect(theoryEntryFor('en', true, 'test')).toBe('hint');
    expect(theoryEntryFor('en', false, 'test')).toBe('hint');
    expect(theoryHasOwnText('en')).toBe(false);
    for (const lang of ['ru', 'uk', 'es'] as const) expect(theoryHasOwnText(lang)).toBe(true);
    const hintSource = require('fs').readFileSync(require('path').join(__dirname, '..', 'app', 'hint.tsx'), 'utf8');
    expect(hintSource).toContain("hasTheoryContent(lessonId) && (theoryHasOwnText(lang) || THEORY_FALLBACK === 'es')");
    expect(hintSource).toContain('titleEn:');
  });

  it.each(['hide', 'es'] as const)('mode %s: ru/uk/es keep their route', (mode) => {
    for (const lang of ['ru', 'uk', 'es'] as const) {
      expect(theoryEntryForMode(lang, true, mode)).toBe('hint');
      expect(theoryEntryForMode(lang, false, mode)).toBe('lesson_help');
    }
  });

  it.each(['hide', 'es'] as const)('mode %s: pt-BR/vi/id/tr/pl go to lesson_help in their own language', (mode) => {
    for (const lang of FIVE) {
      expect(theoryEntryForMode(lang, true, mode)).toBe('lesson_help');
      expect(theoryEntryForMode(lang, false, mode)).toBe('lesson_help');
    }
  });

  it('English: cheat sheet in hide mode, the usual route (Spanish theory) in es mode', () => {
    expect(theoryEntryForMode('en', true, 'hide')).toBe('hint');
    expect(theoryEntryForMode('en', false, 'hide')).toBe('hint');
    expect(theoryEntryForMode('en', true, 'es')).toBe('hint');
    expect(theoryEntryForMode('en', false, 'es')).toBe('lesson_help');
  });
});

// зачем (координатор 12.10, «5 языков → es, как en»): за legacyRuUk/bundleLang словари только ru/uk/es — вместо русского латинский es.
describe('legacyRuUk / bundleLang for pt-BR/vi/id/tr/pl', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { warn.mockRestore(); });

  it.each(FIVE)('%s → es, not ru', (lang) => {
    expect(legacyRuUk(lang)).toBe('es');
    expect(bundleLang(lang)).toBe('es');
  });

  it('ru, uk and es are unchanged', () => {
    for (const fn of [legacyRuUk, bundleLang]) {
      expect(fn('ru')).toBe('ru');
      expect(fn('uk')).toBe('uk');
      expect(fn('es')).toBe('es');
    }
  });

  it('logs [I18N-FALLBACK] once per helper and language', () => {
    // свежий модуль: «раз на помощник и язык» уже исчерпан вызовами из тестов выше
    let fresh!: typeof import('../constants/i18n');
    jest.isolateModules(() => { fresh = require('../constants/i18n'); });
    fresh.legacyRuUk('tr');
    fresh.legacyRuUk('tr');
    fresh.bundleLang('tr');
    const lines = warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('[I18N-FALLBACK]') && l.includes('lang=tr→es'));
    expect(lines).toHaveLength(2);
    expect(lines.some((l) => l.includes('legacyRuUk'))).toBe(true);
    expect(lines.some((l) => l.includes('bundleLang'))).toBe(true);
  });
});
