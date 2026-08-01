const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = path.resolve(__dirname, '../knowly-www/english-level-test/i18n.js');

function loadI18n() {
  const source = fs.readFileSync(modulePath, 'utf8');
  const context = vm.createContext({ URL, URLSearchParams });
  vm.runInContext(source, context, { filename: modulePath });
  return context.EnglishTestI18n;
}

function leafPaths(value, prefix = '') {
  if (typeof value === 'string') return [prefix];
  return Object.keys(value).flatMap((key) => leafPaths(value[key], prefix ? `${prefix}.${key}` : key));
}

test('loads one frozen browser global locale core', () => {
  const i18n = loadI18n();
  assert.ok(i18n);
  assert.equal(Object.isFrozen(i18n), true);
  assert.deepEqual([...i18n.UI_LOCALES], ['ru', 'en']);
  assert.deepEqual([...i18n.TEST_LANGUAGES], ['en', 'de', 'fr', 'it', 'es']);
  assert.deepEqual(Object.keys(i18n).sort(), [
    'DICTIONARY', 'TESTS', 'TEST_LANGUAGES', 'UI_LOCALES', 'persistLocale',
    'readStoredLocale', 'resolveTestLanguage', 'resolveUiLocale', 't', 'updateUrlSelection',
  ]);
});

test('resolves UI locale by valid query, saved choice, then browser language', () => {
  const i18n = loadI18n();
  assert.equal(i18n.resolveUiLocale({ search: '', stored: null, navigatorLanguage: 'ru-RU' }), 'ru');
  assert.equal(i18n.resolveUiLocale({ search: '', stored: null, navigatorLanguage: 'de-DE' }), 'en');
  assert.equal(i18n.resolveUiLocale({ search: '', stored: 'ru', navigatorLanguage: 'en-US' }), 'ru');
  assert.equal(i18n.resolveUiLocale({ search: '?ui=en', stored: 'ru', navigatorLanguage: 'ru-RU' }), 'en');
  assert.equal(i18n.resolveUiLocale({ search: '?ui=xx', stored: null, navigatorLanguage: 'ru-RU' }), 'ru');
  assert.equal(i18n.resolveUiLocale({ search: '', stored: null, navigatorLanguage: 'RU' }), 'ru');
  assert.equal(i18n.resolveUiLocale({ search: '', stored: null, navigatorLanguage: 'Ru-ru' }), 'ru');
});

test('resolves only supported assessed languages and has complete immutable registry', () => {
  const i18n = loadI18n();
  for (const code of i18n.TEST_LANGUAGES) {
    assert.equal(i18n.resolveTestLanguage(`?test=${code}`), code);
    const entry = i18n.TESTS[code];
    assert.match(entry.bcp47, /^[a-z]{2}(?:-[A-Z]{2})?$/);
    assert.equal(entry.bankUrl, `./data/questions.${code}.json?v=20260801-1`);
    assert.equal(typeof entry.names.ru.nominative, 'string');
    assert.equal(typeof entry.names.ru.genitive, 'string');
    assert.equal(typeof entry.names.en.nominative, 'string');
    assert.equal(typeof entry.names.en.genitive, 'string');
    assert.equal(typeof entry.filenameSlug, 'string');
    assert.equal(typeof entry.certificateNames.ru, 'string');
    assert.equal(typeof entry.certificateNames.en, 'string');
    assert.equal(typeof entry.resultNames.ru, 'string');
    assert.equal(typeof entry.resultNames.en, 'string');
    assert.equal(typeof entry.filenameSlugs.ru, 'string');
    assert.equal(typeof entry.filenameSlugs.en, 'string');
    assert.equal(Object.isFrozen(entry), true);
  }
  assert.deepEqual(Object.values(i18n.TESTS).map((entry) => entry.nativeLabel),
    ['English', 'Deutsch', 'Français', 'Italiano', 'Español']);
  assert.equal(i18n.resolveTestLanguage(''), 'en');
  assert.equal(i18n.resolveTestLanguage('?test=xx'), 'en');
  assert.equal(Object.isFrozen(i18n.TESTS), true);
  assert.equal(i18n.TESTS.de.certificateNames.en, 'German');
  assert.equal(i18n.TESTS.fr.certificateNames.ru, 'французского языка');
  assert.equal(i18n.TESTS.fr.resultNames.ru, 'французского языка');
});

test('handles unavailable storage without accepting untrusted saved values', () => {
  const i18n = loadI18n();
  const broken = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
  assert.equal(i18n.readStoredLocale(broken), null);
  assert.equal(i18n.readStoredLocale({ getItem: () => 'xx' }), null);
  assert.equal(i18n.readStoredLocale({ getItem: () => 'ru' }), 'ru');
  assert.equal(i18n.persistLocale('xx', { setItem() {} }), false);
  assert.equal(i18n.persistLocale('ru', broken), false);
  let saved = null;
  assert.equal(i18n.persistLocale('en', { setItem(key, value) { saved = [key, value]; } }), true);
  assert.deepEqual(saved, ['language_test_ui_locale_v1', 'en']);
});

test('updates only allowlisted selection query values without navigation', () => {
  const i18n = loadI18n();
  let replaced = null;
  const href = i18n.updateUrlSelection({
    locationObject: { href: 'https://example.test/level?utm_source=mail&ui=xx#top' },
    historyObject: { replaceState(...args) { replaced = args; } },
    testLanguage: 'de', uiLocale: 'ru',
  });
  assert.equal(href, 'https://example.test/level?utm_source=mail&ui=ru&test=de#top');
  assert.deepEqual(replaced, [null, '', href]);
  assert.equal(i18n.updateUrlSelection({
    locationObject: { href: 'https://example.test/level?ui=ru#top' },
    historyObject: { replaceState() {} }, testLanguage: 'xx', uiLocale: 'xx',
  }), 'https://example.test/level?test=en#top');
  assert.equal(i18n.updateUrlSelection({
    locationObject: { href: 'https://example.test/level?utm=%ZZ&raw=%E0%A4%A&ui=en#frag' },
    historyObject: { replaceState() {} }, testLanguage: 'fr', uiLocale: 'ru',
  }), 'https://example.test/level?utm=%ZZ&raw=%E0%A4%A&ui=ru&test=fr#frag');
});

test('keeps matching complete dictionaries and safely interpolates own variables', () => {
  const i18n = loadI18n();
  assert.deepEqual(leafPaths(i18n.DICTIONARY.ru).sort(), leafPaths(i18n.DICTIONARY.en).sort());
  assert.equal(i18n.t('en', 'result.score', { correct: 7, answered: 10 }), '7 correct out of 10 answered');
  assert.throws(() => i18n.t('xx', 'header.title'), /locale/i);
  assert.throws(() => i18n.t('en', 'missing.key'), /key/i);
  assert.throws(() => i18n.t('en', 'result.score', { correct: 7 }), /answered/i);
  assert.throws(() => i18n.t('en', 'header.constructor'), /key/i);
  assert.equal(i18n.t('en', 'result.score', { correct: '<b>7</b>', answered: 10, ignored: 'x' }), '&lt;b&gt;7&lt;/b&gt; correct out of 10 answered');
  assert.equal(i18n.t('en', 'result.score', { correct: '<img src=x onerror="x">&\' ', answered: 10 }), '&lt;img src=x onerror=&quot;x&quot;&gt;&amp;&#39;  correct out of 10 answered');
  assert.equal(Object.isFrozen(i18n.DICTIONARY), true);
});

test('provides explicit accessible text-only assessment copy for every planned screen', () => {
  const i18n = loadI18n();
  const REQUIRED_COPY_KEYS = [
    'landing.howItWorks', 'landing.certificatePreview', 'landing.trust', 'landing.finalCta',
    'aria.answerRadiogroup', 'aria.answerOptions', 'aria.certificateDialog', 'aria.certificateLanguage',
    'aria.certificateTheme', 'aria.iosSavePreview', 'aria.storeLinks', 'aria.timer',
    'aria.testSelector', 'aria.localeToggle',
    'question.skip', 'question.exit', 'question.answerGroup', 'question.timerRemaining', 'question.number',
    'exitConfirm.title', 'exitConfirm.text', 'exitConfirm.stay', 'exitConfirm.leave',
    'sharing.webShareTitle', 'sharing.resultPayload', 'sharing.copied', 'sharing.clipboardPrompt',
    'certificate.dialogLabel', 'certificate.closeLabel', 'certificate.languageGroup', 'certificate.themeGroup',
    'certificate.create', 'certificate.downloadPng', 'certificate.printPdf', 'certificate.close',
    'certificate.iosReadyImageAlt', 'certificate.iosLongPressHint', 'certificate.pngFailure', 'certificate.printTitle',
    'certificate.ctaText', 'certificate.ctaButton', 'certificate.bodyTitle', 'certificate.certifies',
    'certificate.completed', 'certificate.received', 'certificate.summary', 'certificate.informal',
    'certificate.themes.gold', 'certificate.themes.dark', 'certificate.themes.emerald', 'certificate.themes.rose', 'certificate.themes.royal',
    'resultCta.low.title', 'resultCta.low.text', 'resultCta.low.button',
    'resultCta.mid.title', 'resultCta.mid.text', 'resultCta.mid.button',
    'resultCta.high.title', 'resultCta.high.text', 'resultCta.high.button',
    'storeBadges.appStore', 'storeBadges.googlePlay', 'storeBadges.appStoreAria', 'storeBadges.googlePlayAria',
    'loading.title', 'loading.text', 'error.title', 'error.text', 'error.retry',
    'name.placeholder', 'alerts.nameRequired', 'stats.correct', 'stats.answered', 'stats.time',
    'sharing.restart', 'sharing.copy', 'certificate.cta', 'footer.copyright', 'footer.terms', 'footer.privacy',
  ];
  for (const locale of i18n.UI_LOCALES) {
    for (const key of REQUIRED_COPY_KEYS) assert.equal(typeof i18n.t(locale, key, { count: 1, correct: 1, answered: 1, language: 'English', level: 'A1' }), 'string', `${locale}.${key}`);
    assert.match(i18n.t(locale, 'result.scope'), locale === 'ru' ? /аудирование.*говорение.*письмо/i : /listening.*speaking.*writing/i);
    assert.doesNotMatch(i18n.t(locale, 'levels.B2'), locale === 'ru' ? /речь/i : /speech/i);
    assert.match(i18n.t(locale, 'resultCta.text'), locale === 'ru' ? /английск/i : /English/i);
  }
});

test('uses natural genitive result names and text-only level claims in both locales', () => {
  const i18n = loadI18n();
  const ruNames = { en: 'английского языка', de: 'немецкого языка', fr: 'французского языка', it: 'итальянского языка', es: 'испанского языка' };
  for (const [code, name] of Object.entries(ruNames)) {
    assert.equal(i18n.TESTS[code].resultNames.ru, name);
    assert.equal(i18n.t('ru', 'result.subject', { language: name }), `Уровень ${name}`);
    assert.equal(i18n.t('en', 'result.subject', { language: i18n.TESTS[code].resultNames.en }), `${i18n.TESTS[code].resultNames.en} level`);
  }
  const levelKeys = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  for (const locale of i18n.UI_LOCALES) {
    for (const level of levelKeys) {
      const copy = i18n.t(locale, `levels.${level}`);
      assert.match(copy, locale === 'ru' ? /текст|письмен/i : /text|written/i);
      assert.doesNotMatch(copy, locale === 'ru' ? /говор|обща|выража(ть|ет|ют)|произн|слуш/i : /speak|communicat|express(?!ions)|produc|listen/i);
    }
  }
  assert.doesNotMatch(i18n.t('ru', 'resultCta.low.text'), /English/);
  assert.match(i18n.t('ru', 'resultCta.low.text'), /английск/i);
  assert.match(i18n.t('en', 'resultCta.low.text'), /English/);
});
