import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(__dirname, '..');
const surface = path.join(root, 'knowly-www', 'english-level-test');
const languages = ['en', 'de', 'fr', 'it', 'es'] as const;
const locales = ['ru', 'en', 'de', 'es', 'it', 'fr'] as const;
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadI18n() {
  const sandbox: Record<string, unknown> = { URL, URLSearchParams };
  vm.runInNewContext(read('knowly-www/english-level-test/i18n.locales.js'), sandbox);
  vm.runInNewContext(read('knowly-www/english-level-test/i18n.js'), sandbox);
  return sandbox.EnglishTestI18n as {
    UI_LOCALES: readonly string[];
    TEST_LANGUAGES: readonly string[];
    TESTS: Record<string, { bankUrl: string; names: Record<string, unknown> }>;
    DICTIONARY: Record<string, unknown>;
    resolveTestLanguage(search: string): string;
  };
}

describe('multilingual language-test production release', () => {
  test('publishes five assessed languages and six complete interface locales', () => {
    const i18n = loadI18n();
    expect(Array.from(i18n.TEST_LANGUAGES)).toEqual(languages);
    expect(Array.from(i18n.UI_LOCALES)).toEqual(locales);
    expect(Object.keys(i18n.TESTS)).toEqual(languages);
    expect(Object.keys(i18n.DICTIONARY).sort()).toEqual([...locales].sort());

    for (const language of languages) {
      expect(i18n.resolveTestLanguage(`?test=${language}`)).toBe(language);
      for (const locale of locales) expect(i18n.TESTS[language].names[locale]).toBeDefined();
    }
    expect(i18n.resolveTestLanguage('?test=xx')).toBe('en');
  });

  test('ships identical reviewed 240-item banks to hosting and functions', () => {
    for (const language of languages) {
      const hostingPath = path.join(surface, 'data', `questions.${language}.json`);
      const functionsPath = path.join(root, 'functions-english-test', 'data', `questions.${language}.json`);
      const hosting = JSON.parse(fs.readFileSync(hostingPath, 'utf8'));
      const functions = JSON.parse(fs.readFileSync(functionsPath, 'utf8'));
      expect(functions).toEqual(hosting);
      expect(hosting.language).toBe(language);
      expect(hosting.levels).toEqual(levels);
      expect(hosting.questions).toHaveLength(240);
      expect(new Set(hosting.questions.map((question: { id: string }) => question.id)).size).toBe(240);
      expect(hosting.questions.every((question: { id: string }) => (
        new RegExp(`^${language}-(a1|a2|b1|b2|c1|c2)-\\d{3}$`).test(question.id)
      ))).toBe(true);
      expect(fs.existsSync(path.join(surface, 'assets', 'flags', `${language}.webp`))).toBe(true);
    }
  });

  test('server analytics, counters, and site reports accept only released languages', () => {
    const server = read('functions-english-test/index.js');
    const counter = read('functions-english-test/completion_counter.js');
    const report = read('functions-english-test/site_report.js');
    expect(server).toContain("const TEST_LANGUAGES = ['en', 'de', 'fr', 'it', 'es'];");
    expect(server).toContain('/^(en|de|fr|it|es)-(a1|a2|b1|b2|c1|c2)-\\d{3}$/');
    expect(counter).toContain('const TEST_LANGUAGES = ["en", "de", "fr", "it", "es"];');
    expect(report).toContain("const TEST_LANGUAGES = new Set(['en', 'de', 'fr', 'it', 'es']);");
    expect(report).toContain('/^(en|de|fr|it|es)-(a1|a2|b1|b2|c1|c2)-\\d{3}$/');
  });
});
