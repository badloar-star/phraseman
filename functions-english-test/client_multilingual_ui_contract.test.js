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
    assert.equal(Object.isFrozen(entry), true);
  }
  assert.deepEqual(Object.values(i18n.TESTS).map((entry) => entry.nativeLabel),
    ['English', 'Deutsch', 'Français', 'Italiano', 'Español']);
  assert.equal(i18n.resolveTestLanguage(''), 'en');
  assert.equal(i18n.resolveTestLanguage('?test=xx'), 'en');
  assert.equal(Object.isFrozen(i18n.TESTS), true);
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
});

test('keeps matching complete dictionaries and safely interpolates own variables', () => {
  const i18n = loadI18n();
  assert.deepEqual(leafPaths(i18n.DICTIONARY.ru).sort(), leafPaths(i18n.DICTIONARY.en).sort());
  assert.equal(i18n.t('en', 'result.score', { correct: 7, answered: 10 }), '7 correct out of 10 answered');
  assert.throws(() => i18n.t('xx', 'header.title'), /locale/i);
  assert.throws(() => i18n.t('en', 'missing.key'), /key/i);
  assert.throws(() => i18n.t('en', 'result.score', { correct: 7 }), /answered/i);
  assert.throws(() => i18n.t('en', 'header.constructor'), /key/i);
  assert.equal(i18n.t('en', 'result.score', { correct: '<b>7</b>', answered: 10, ignored: 'x' }), '<b>7</b> correct out of 10 answered');
  assert.equal(Object.isFrozen(i18n.DICTIONARY), true);
});
