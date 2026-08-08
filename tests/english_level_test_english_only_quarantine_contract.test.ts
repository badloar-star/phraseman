import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('multilingual level test production release', () => {
  test('publishes five assessments with six interface locales across client and server', () => {
    const i18n = read('knowly-www/english-level-test/i18n.js');
    const index = read('knowly-www/english-level-test/index.html');
    const server = read('functions-english-test/index.js');
    const completionCounter = read('functions-english-test/completion_counter.js');
    const siteReport = read('functions-english-test/site_report.js');

    expect(i18n).toContain("const TEST_LANGUAGES = ['en', 'de', 'fr', 'it', 'es'];");
    expect(i18n).toContain('EnglishTestExtraLocales');
    expect(index).toContain('i18n.locales.js?v=20260803-1');
    expect(server).toContain("const TEST_LANGUAGES = ['en', 'de', 'fr', 'it', 'es'];");
    expect(server).toContain("const UI_LOCALES = ['ru', 'en', 'de', 'es', 'it', 'fr'];");
    expect(server).toContain('.filter(isReleasedAnalyticsAttempt)');
    expect(completionCounter).toContain('const TEST_LANGUAGES = ["en", "de", "fr", "it", "es"];');
    expect(siteReport).toContain("const TEST_LANGUAGES = new Set(['en', 'de', 'fr', 'it', 'es']);");
    expect(siteReport).toContain("const UI_LOCALES = new Set(['ru', 'en', 'de', 'es', 'it', 'fr']);");
    expect(siteReport).toContain('const QUESTION_ID_PATTERN = /^(en|de|fr|it|es)-(a1|a2|b1|b2|c1|c2)-\\d{3}$/;');
  });

  test('ships every reviewed non-English bank to hosting and functions', () => {
    for (const language of ['de', 'fr', 'it', 'es']) {
      const hosted = path.join(root, `knowly-www/english-level-test/data/questions.${language}.json`);
      const functions = path.join(root, `functions-english-test/data/questions.${language}.json`);
      expect(fs.existsSync(hosted)).toBe(true);
      expect(fs.existsSync(functions)).toBe(true);
      expect(fs.readFileSync(hosted, 'utf8')).toBe(fs.readFileSync(functions, 'utf8'));
    }
  });

  test('keeps the site error-report surface active for every released language', () => {
    const app = read('knowly-www/english-level-test/app.js');
    const server = read('functions-english-test/index.js');
    expect(app).toContain('id="reportErrorBtn"');
    expect(app).toContain("action: 'report_error'");
    expect(server).toContain("if (action === 'report_error')");
  });
});
