import fs from 'fs';
import path from 'path';
import vm from 'vm';

type TranslationTree = string | { [key: string]: TranslationTree };

type EnglishTestI18nApi = {
  UI_LOCALES: readonly string[];
  TEST_LANGUAGES: readonly string[];
  DICTIONARY: Record<string, TranslationTree>;
  TESTS: Record<string, {
    filenameSlugs: Record<string, string>;
    certificateNames: Record<string, string>;
    resultNames: Record<string, string>;
    names: Record<string, { nominative: string; genitive: string; subject: string }>;
  }>;
  resolveUiLocale(options: { search: string; stored: string | null; navigatorLanguage: string }): string;
  t(locale: string, key: string, vars?: Record<string, string | number>): string;
};

const root = path.resolve(__dirname, '..');
const extraLocalesPath = path.join(root, 'knowly-www', 'english-level-test', 'i18n.locales.js');
const i18nPath = path.join(root, 'knowly-www', 'english-level-test', 'i18n.js');
const appPath = path.join(root, 'knowly-www', 'english-level-test', 'app.js');
const certificatePath = path.join(root, 'knowly-www', 'english-level-test', 'certificate.js');

function loadI18n(): EnglishTestI18nApi {
  const sandbox: { EnglishTestI18n?: EnglishTestI18nApi } = {};
  vm.runInNewContext(fs.readFileSync(extraLocalesPath, 'utf8'), sandbox, { filename: extraLocalesPath });
  vm.runInNewContext(fs.readFileSync(i18nPath, 'utf8'), sandbox, { filename: i18nPath });
  if (!sandbox.EnglishTestI18n) throw new Error('EnglishTestI18n was not exported');
  return sandbox.EnglishTestI18n;
}

function leafKeys(tree: TranslationTree, prefix = ''): string[] {
  if (typeof tree === 'string') return [prefix];
  return Object.entries(tree).flatMap(([key, value]) => leafKeys(value, prefix ? `${prefix}.${key}` : key));
}

describe('English level test UI localization contract', () => {
  const i18n = loadI18n();
  const expectedLocales = ['ru', 'en', 'de', 'es', 'it', 'fr'];

  test('ships complete Russian, English, German, Spanish, Italian, and French dictionaries', () => {
    expect(Array.from(i18n.UI_LOCALES)).toEqual(expectedLocales);
    const englishKeys = leafKeys(i18n.DICTIONARY.en).sort();
    expect(englishKeys.length).toBeGreaterThan(150);

    for (const locale of expectedLocales) {
      expect(i18n.DICTIONARY[locale]).toBeDefined();
      expect(leafKeys(i18n.DICTIONARY[locale]).sort()).toEqual(englishKeys);
    }
  });

  test.each([
    ['de-DE', 'de'],
    ['es-MX', 'es'],
    ['it-CH', 'it'],
    ['fr-CA', 'fr'],
  ])('selects %s browser language as the %s interface', (navigatorLanguage, expected) => {
    expect(i18n.resolveUiLocale({ search: '', stored: null, navigatorLanguage })).toBe(expected);
  });

  test('provides localized language grammar and certificate filenames for every test language', () => {
    for (const testLanguage of i18n.TEST_LANGUAGES) {
      const config = i18n.TESTS[testLanguage];
      for (const locale of expectedLocales) {
        expect(config.filenameSlugs[locale]).toEqual(expect.any(String));
        expect(config.certificateNames[locale]).toEqual(expect.any(String));
        expect(config.resultNames[locale]).toEqual(expect.any(String));
        expect(config.names[locale]).toEqual({
          nominative: expect.any(String),
          genitive: expect.any(String),
          subject: expect.any(String),
        });
      }
    }
  });

  test('contains natural localized core copy rather than English placeholders', () => {
    expect(i18n.t('de', 'landing.title', { language: 'Spanisch' })).toBe('Finde dein Niveau in Spanisch');
    expect(i18n.t('es', 'question.skip')).toBe('No lo sé');
    expect(i18n.t('it', 'result.title')).toBe('Il tuo risultato');
    expect(i18n.t('fr', 'certificate.bodyTitle')).toBe('Certificat de réussite');
  });

  test('renders a direct six-language interface selector and six certificate languages', () => {
    const appSource = fs.readFileSync(appPath, 'utf8');
    const certificateSource = fs.readFileSync(certificatePath, 'utf8');

    expect(appSource).toContain('data-ui-locale');
    expect(appSource).toContain("addEventListener('change'");
    expect(certificateSource).toContain('EnglishTestI18n.UI_LOCALES');
    expect(certificateSource).not.toContain("return locale === 'ru' ? 'ru' : 'en'");
  });
});
