const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const CLIENT_DIR = path.dirname(require.resolve('../knowly-www/english-level-test/certificate.js'));
const read = (file) => fs.readFileSync(path.join(CLIENT_DIR, file), 'utf8');
const certificateSource = read('certificate.js');
const appSource = read('app.js');

function loadI18n() {
  const context = vm.createContext({ URL, URLSearchParams });
  vm.runInContext(read('i18n.locales.js'), context);
  vm.runInContext(read('i18n.js'), context);
  return context.EnglishTestI18n;
}

test('certificate registry exposes five assessments with six complete interface locales', () => {
  const i18n = loadI18n();
  assert.deepEqual(Array.from(i18n.TEST_LANGUAGES), ['en', 'de', 'fr', 'it', 'es']);
  assert.deepEqual(Array.from(i18n.UI_LOCALES), ['ru', 'en', 'de', 'es', 'it', 'fr']);
  assert.equal(i18n.TESTS.en.certificateNames.en, 'English');
  assert.equal(i18n.TESTS.en.certificateNames.ru, 'английского языка');
  assert.equal(i18n.t('en', 'certificate.completed', { language: 'English' }), 'completed the Phraseman English Level Check');
  assert.equal(i18n.t('ru', 'certificate.completed', { language: 'английского языка' }), 'за прохождение проверки уровня английского языка Phraseman');
});

test('certificate keeps RU and EN controls, all themes, dialog semantics, and safe filenames', () => {
  for (const token of [
    'aria-modal="true"',
    'certificate.languageGroup',
    'certificate.themeGroup',
    'EnglishTestI18n.UI_LOCALES.map',
    'const THEMES =',
    'sanitizeFilenameComponent',
    'CERTIFICATE_LEVELS',
    'certificate.downloadPng',
    'certificate.printPdf',
  ]) assert.ok(certificateSource.includes(token), token);

  assert.match(certificateSource, /if \(!printWindow\) return/);
  assert.match(certificateSource, /if \(!reducedMotion\) createConfetti/);
  assert.match(certificateSource, /aria-pressed="\$\{String\(key === currentTheme\)\}"/);
});

test('certificate rendering escapes learner data and preserves localized result copy', () => {
  assert.match(certificateSource, /escapeXml\(name\)/);
  assert.match(certificateSource, /escapeXml\(result\.estimatedLevel\)/);
  assert.match(certificateSource, /certificate\.summary/);
  assert.match(certificateSource, /certificate\.informal/);
  assert.doesNotMatch(certificateSource, /innerHTML\s*=\s*data\.name/);
});

test('application freezes the current supported locale and test language for certificate creation', () => {
  assert.match(appSource, /uiLocale,\s*\n\s*testLanguage: attemptTestLanguage \|\| selectedTestLanguage/);
  assert.match(appSource, /EnglishTestI18n\.TESTS\[certData\.testLanguage\]\.certificateNames\[uiLocale\]/);
  assert.match(appSource, /api\('certificate', \{\}\)/);
  assert.doesNotMatch(appSource, /api\('certificate', \{\s*name/);
});

test('supported certificate language input resolves directly and unknown values fall back safely', () => {
  const i18n = loadI18n();
  assert.equal(i18n.resolveTestLanguage('?test=fr'), 'fr');
  assert.equal(i18n.resolveUiLocale({ search: '?ui=fr', stored: null, browserLanguage: 'fr-FR' }), 'fr');
  assert.equal(i18n.resolveTestLanguage('?test=xx'), 'en');
  assert.equal(i18n.resolveUiLocale({ search: '?ui=xx', stored: 'xx', browserLanguage: 'xx-XX' }), 'en');
});
