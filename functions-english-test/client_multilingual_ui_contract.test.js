const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const CLIENT_DIR = path.dirname(require.resolve('../knowly-www/english-level-test/app.js'));
const read = (file) => fs.readFileSync(path.join(CLIENT_DIR, file), 'utf8');
const appSource = read('app.js');
const indexSource = read('index.html');

function loadI18n() {
  const context = vm.createContext({ URL, URLSearchParams });
  vm.runInContext(read('i18n.locales.js'), context, { filename: path.join(CLIENT_DIR, 'i18n.locales.js') });
  vm.runInContext(read('i18n.js'), context, { filename: path.join(CLIENT_DIR, 'i18n.js') });
  return context.EnglishTestI18n;
}

test('browser registry exposes five assessments with six complete interface dictionaries', () => {
  const i18n = loadI18n();
  assert.deepEqual(Array.from(i18n.TEST_LANGUAGES), ['en', 'de', 'fr', 'it', 'es']);
  assert.deepEqual(Array.from(i18n.UI_LOCALES), ['ru', 'en', 'de', 'es', 'it', 'fr']);
  assert.deepEqual(Object.keys(i18n.TESTS), ['en', 'de', 'fr', 'it', 'es']);
  assert.equal(Object.isFrozen(i18n.TESTS), true);

  for (const locale of i18n.UI_LOCALES) {
    for (const key of [
      'landing.start', 'question.skip', 'question.exit',
      'result.level', 'certificate.downloadPng', 'report.trigger', 'report.submit',
    ]) {
      const vars = key === 'result.level' ? { level: 'B1' } : undefined;
      assert.notEqual(i18n.t(locale, key, vars), key, `${locale}:${key}`);
    }
    assert.notEqual(i18n.t(locale, 'landing.title', { language: 'English' }), 'landing.title');
  }
});

test('supported query values resolve directly while unknown values fall back to English', () => {
  const i18n = loadI18n();
  for (const code of ['de', 'fr', 'it', 'es']) {
    assert.equal(i18n.resolveTestLanguage(`?test=${code}`), code);
    assert.equal(i18n.resolveUiLocale({ search: `?ui=${code}`, stored: code, browserLanguage: `${code}-${code.toUpperCase()}` }), code);
  }
  assert.equal(i18n.resolveTestLanguage('?test=xx'), 'en');
  assert.equal(i18n.resolveUiLocale({ search: '?ui=xx', stored: 'xx', browserLanguage: 'xx-XX' }), 'en');
  assert.equal(i18n.resolveTestLanguage('?test=en'), 'en');
  assert.equal(i18n.resolveUiLocale({ search: '?ui=ru', stored: null, browserLanguage: 'en-US' }), 'ru');
  assert.equal(i18n.resolveUiLocale({ search: '?ui=en', stored: 'ru', browserLanguage: 'ru-RU' }), 'en');
});

test('HTML loads locale dictionaries before the i18n core, certificate, and application scripts', () => {
  const scripts = [...indexSource.matchAll(/<script src="([^"]+)"><\/script>/g)].map((match) => match[1]);
  assert.deepEqual(scripts, [
    './engine.js?v=20260803-1',
    './i18n.locales.js?v=20260803-1',
    './i18n.js?v=20260803-1',
    './certificate.js?v=20260803-1',
    './app.js?v=20260803-1',
  ]);
});

test('client loads every versioned released bank and rejects unknown languages', () => {
  const i18n = loadI18n();
  for (const code of i18n.TEST_LANGUAGES) {
    const bank = JSON.parse(read(`data/questions.${code}.json`));
    assert.equal(i18n.TESTS[code].bankUrl, `./data/questions.${code}.json?v=${bank.bankVersion}`);
  }
  assert.match(appSource, /fetch\(EnglishTestI18n\.TESTS\[language\]\.bankUrl\)/);
  assert.match(appSource, /EnglishTestI18n\.TEST_LANGUAGES\.includes\(language\)/);
});

test('attempt language locks after start while RU and EN interface locale remains switchable', () => {
  assert.match(appSource, /if \(attemptTestLanguage !== null \|\| !EnglishTestI18n\.TEST_LANGUAGES\.includes\(code\)\) return/);
  assert.match(appSource, /attemptTestLanguage = selectedTestLanguage/);
  assert.match(appSource, /const testLanguage = attemptTestLanguage \|\| selectedTestLanguage/);
  assert.match(appSource, /function setUiLocale\(locale\)/);
  assert.match(appSource, /rerenderForUiLocale\(\)/);
});

test('question UI keeps English assessed material separate from localized service chrome', () => {
  assert.match(appSource, /testLanguage === 'en'/);
  assert.match(appSource, /scenario: q\.scenario, instruction: q\.prompt, language: 'en'/);
  assert.match(appSource, /scenario: copy\('question\.context'\), instruction: copy\('question\.contextInstruction'\), language: uiLocale/);
  assert.match(appSource, /class="elt-stimulus" lang="\$\{questionLanguage\}"/);
  assert.match(appSource, /class="elt-option-text" lang="\$\{questionLanguage\}"/);
});

test('answer selection has an immediate gate against keyboard, click, and deadline races', () => {
  assert.match(appSource, /if \(answerLocked\) return/);
  assert.match(appSource, /answerLocked = true/);
  assert.match(appSource, /e\.key === 'Enter' \|\| e\.key === ' '/);
  assert.match(appSource, /selectAnswer\(/);
  assert.match(appSource, /clearInterval\(questionTimerId\)/);
});

test('in-test error reports remain at the bottom and go only through the site API', () => {
  assert.match(appSource, /class="elt-report-trigger" id="reportErrorBtn"/);
  assert.match(appSource, /action: 'report_error'/);
  assert.match(appSource, /source: 'site'/);
  assert.match(appSource, /fetch\(API_BASE/);
  assert.doesNotMatch(appSource, /collection\([^\n]*error_reports/);
  assert.match(appSource, /userAnswer:\s*Number\.isInteger\(selectedAnswerIndex\)\s*&&\s*selectedAnswerIndex\s*>=\s*0/);
});
