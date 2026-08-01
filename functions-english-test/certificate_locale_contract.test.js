const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const CLIENT_DIR = path.dirname(require.resolve('../knowly-www/english-level-test/certificate.js'));
const read = (file) => fs.readFileSync(path.join(CLIENT_DIR, file), 'utf8');

function loadI18n() {
  const context = vm.createContext({ URL, URLSearchParams });
  vm.runInContext(read('i18n.js'), context);
  return context.EnglishTestI18n;
}

function certificateHelpers(i18n) {
  const source = read('certificate.js').replace(
    'themes: THEMES,',
    'themes: THEMES, _buildSvg: buildSvg,',
  );
  const context = vm.createContext({
    EnglishTestI18n: i18n,
    navigator: {},
    window: {},
    globalThis: {},
    URL,
    Blob,
    Image: class {},
    XMLSerializer: class {},
    setTimeout,
  });
  vm.runInContext(source, context);
  return context.window.EnglishTestCertificate;
}

const result = { estimatedLevel: 'B2', correct: 8, answered: 10 };

test('certificate body defaults to page UI locale and always names the assessed language', () => {
  const i18n = loadI18n();
  const certificate = certificateHelpers(i18n);

  for (const uiLocale of ['en', 'ru']) {
    for (const testLanguage of i18n.TEST_LANGUAGES) {
      const svg = certificate._buildSvg({ name: 'Alex', result, uiLocale, testLanguage }, 'gold', uiLocale);
      const subject = i18n.t(uiLocale, 'certificate.completed', {
        language: i18n.TESTS[testLanguage].certificateNames[uiLocale],
      });
      assert.match(svg, new RegExp(subject));
    }
  }

  assert.match(
    certificate._buildSvg({ name: 'Alex', result, uiLocale: 'en', testLanguage: 'de' }, 'gold', 'en'),
    /Phraseman German Level Check/,
  );
  assert.match(
    certificate._buildSvg({ name: 'Alex', result, uiLocale: 'ru', testLanguage: 'fr' }, 'gold', 'ru'),
    /проверки уровня французского языка Phraseman/,
  );
});

test('certificate validates locale and subject and filename uses the assessed-language slug', () => {
  const i18n = loadI18n();
  const certificate = certificateHelpers(i18n);

  assert.match(
    certificate._buildSvg({ name: 'Alex', result, uiLocale: 'unknown', testLanguage: 'unknown' }, 'gold', 'unknown'),
    /Phraseman English Level Check/,
  );
  assert.match(read('certificate.js'), /certificateFilename\(data, themeKey\)/);
  assert.match(read('certificate.js'), /phraseman-\$\{language\.filenameSlug\}-level-/);
});

test('app passes frozen UI and assessed-language context to the certificate without analytics name data', () => {
  const app = read('app.js');
  assert.match(app, /uiLocale,\s*testLanguage:\s*attemptTestLanguage \|\| selectedTestLanguage/);
  assert.match(app, /certificateNames\[uiLocale\]/);
  assert.match(app, /api\('certificate', \{\}\)/);
  assert.doesNotMatch(app, /api\('certificate',\s*\{[^}]*name/);
});
