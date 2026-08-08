import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

type TranslationTree = string | { [key: string]: TranslationTree };
type I18nApi = {
  UI_LOCALES: readonly string[];
  TEST_LANGUAGES: readonly string[];
  DICTIONARY: Record<string, TranslationTree>;
  TESTS: Record<string, { filenameSlugs: Record<string, string>; certificateNames: Record<string, string>; resultNames: Record<string, string>; names: Record<string, { nominative: string; genitive: string; subject: string }> }>;
  resolveUiLocale(options: { search: string; stored: string | null; navigatorLanguage: string }): string;
  resolveTestLanguage(search: string): string;
  t(locale: string, key: string, vars?: Record<string, string | number>): string;
};

const root = path.resolve(__dirname, '..');
const surface = path.join(root, 'knowly-www', 'english-level-test');

function loadI18n(): I18nApi {
  const sandbox: { EnglishTestI18n?: I18nApi } = {};
  const file = path.join(surface, 'i18n.js');
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  if (!sandbox.EnglishTestI18n) throw new Error('EnglishTestI18n was not exported');
  return sandbox.EnglishTestI18n;
}

function leafKeys(tree: TranslationTree, prefix = ''): string[] {
  if (typeof tree === 'string') return [prefix];
  return Object.entries(tree).flatMap(([key, value]) => leafKeys(value, prefix ? `${prefix}.${key}` : key));
}

describe('English assessment localization contract', () => {
  const i18n = loadI18n();

  test('ships complete Russian and English interface dictionaries only', () => {
    expect(Array.from(i18n.UI_LOCALES)).toEqual(['ru', 'en']);
    const englishKeys = leafKeys(i18n.DICTIONARY.en).sort();
    expect(englishKeys.length).toBeGreaterThan(150);
    expect(leafKeys(i18n.DICTIONARY.ru).sort()).toEqual(englishKeys);
    expect(Object.keys(i18n.DICTIONARY).sort()).toEqual(['en', 'ru']);
  });

  test('publishes only the English assessment and rejects stale language links', () => {
    expect(Array.from(i18n.TEST_LANGUAGES)).toEqual(['en']);
    expect(Object.keys(i18n.TESTS)).toEqual(['en']);
    expect(i18n.resolveTestLanguage('?test=fr')).toBe('en');
    expect(i18n.resolveTestLanguage('?test=en')).toBe('en');
  });

  test('uses RU/EN browser locale resolution with an English fallback', () => {
    expect(i18n.resolveUiLocale({ search: '', stored: null, navigatorLanguage: 'ru-RU' })).toBe('ru');
    expect(i18n.resolveUiLocale({ search: '', stored: null, navigatorLanguage: 'en-GB' })).toBe('en');
    expect(i18n.resolveUiLocale({ search: '', stored: null, navigatorLanguage: 'de-DE' })).toBe('en');
  });

  test('keeps natural RU/EN copy and certificate grammar for English', () => {
    expect(i18n.t('ru', 'question.skip')).toBe('Не знаю');
    expect(i18n.t('en', 'result.title')).toBe('Your result');
    for (const locale of i18n.UI_LOCALES) {
      expect(i18n.TESTS.en.filenameSlugs[locale]).toEqual(expect.any(String));
      expect(i18n.TESTS.en.certificateNames[locale]).toEqual(expect.any(String));
      expect(i18n.TESTS.en.resultNames[locale]).toEqual(expect.any(String));
      expect(i18n.TESTS.en.names[locale]).toEqual({ nominative: expect.any(String), genitive: expect.any(String), subject: expect.any(String) });
    }
  });
});
