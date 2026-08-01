const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const modulePath = require.resolve('../knowly-www/english-level-test/i18n.js');
const appPath = require.resolve('../knowly-www/english-level-test/app.js');

class FakeNode {
  constructor(html = '') {
    this.innerHTML = html;
    this.children = [];
    this.nodes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    this.style = {};
    this.classList = { add() {} };
    this.isConnected = true;
    this.checked = false;
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  click() { this.listeners.get('click')?.({}); }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  remove() { this.isConnected = false; }
  setAttribute(name, value) { this[name] = String(value); }
  getAttribute(name) {
    const match = this.innerHTML.match(new RegExp(`${name}="([^"]*)"`));
    return match ? match[1] : null;
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    if (selector === '[data-magnet]' || selector === '.elt-brand-icon') return [];
    if (selector === '[data-test-language]') {
      return [...this.innerHTML.matchAll(/<button[^>]*data-test-language="([^"]+)"[^>]*>.*?<\/button>/gs)]
        .map((match) => {
          if (!this.nodes.has(match[1])) this.nodes.set(match[1], Object.assign(new FakeNode(match[0]), { dataset: { testLanguage: match[1] } }));
          return this.nodes.get(match[1]);
        });
    }
    const token = selector.startsWith('#') ? `id="${selector.slice(1)}"`
      : selector.startsWith('.') ? `class="[^"]*${selector.slice(1)}[^"]*"`
        : selector;
    if (!new RegExp(token).test(this.innerHTML)) return [];
    if (!this.nodes.has(selector)) this.nodes.set(selector, new FakeNode(this.innerHTML));
    return [this.nodes.get(selector)];
  }
}

function loadLandingApp({ href = 'https://example.test/level?ui=en', source = fs.readFileSync(appPath, 'utf8') } = {}) {
  const app = new FakeNode();
  const storageValues = new Map();
  const location = { href, get search() { return new URL(this.href).search; } };
  const description = new FakeNode();
  const document = {
    documentElement: new FakeNode(),
    title: '',
    visibilityState: 'visible',
    getElementById: () => app,
    createElement: () => {
      const template = { content: {} };
      Object.defineProperty(template, 'innerHTML', { set(value) { template.content.firstElementChild = new FakeNode(value); } });
      return template;
    },
    querySelector: (selector) => selector === 'meta[name="description"]' ? description : null,
    addEventListener() {},
  };
  const history = { replaceState(_state, _title, nextHref) { location.href = new URL(nextHref, location.href).href; } };
  const context = {
    URL,
    URLSearchParams,
    Uint8Array,
    Array,
    Date,
    Math,
    JSON,
    Promise,
    Set,
    WeakMap,
    console,
    location,
    history,
    document,
    navigator: { language: 'en-US', userAgent: 'test', platform: 'test', maxTouchPoints: 0 },
    localStorage: { getItem: (key) => storageValues.get(key) || null, setItem: (key, value) => storageValues.set(key, String(value)), removeItem: (key) => storageValues.delete(key), get length() { return storageValues.size; }, key: (index) => [...storageValues.keys()][index] || null },
    crypto: { getRandomValues: (values) => values.fill(1) },
    fetch: () => new Promise(() => {}),
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    setTimeout: () => 0,
    clearTimeout() {},
    window: { matchMedia: () => ({ matches: true }), addEventListener() {}, scrollTo() {} },
  };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });
  vm.runInNewContext(source, context, { filename: appPath });
  return { app, context, description, location, storageValues, view: () => app.children.at(-1) };
}

function loadI18n(globals = {}) {
  const source = fs.readFileSync(modulePath, 'utf8');
  const { localStorageGetter, ...values } = globals;
  const context = vm.createContext({ URL, URLSearchParams, ...values });
  if (localStorageGetter) Object.defineProperty(context, 'localStorage', { configurable: true, get: localStorageGetter });
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
  assert.equal(Object.isFrozen(i18n.TESTS.de.names.ru), true);
  const originalGermanName = i18n.TESTS.de.names.ru.nominative;
  i18n.TESTS.de.names.ru.nominative = 'changed';
  assert.equal(i18n.TESTS.de.names.ru.nominative, originalGermanName);
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

test('uses browser localStorage for zero-argument locale persistence and catches inaccessible storage', () => {
  let saved = null;
  const i18n = loadI18n({ localStorage: { getItem: () => 'ru', setItem: (key, value) => { saved = [key, value]; } } });
  assert.equal(i18n.readStoredLocale(), 'ru');
  assert.equal(i18n.persistLocale('en'), true);
  assert.deepEqual(saved, ['language_test_ui_locale_v1', 'en']);
  const blocked = loadI18n({ localStorageGetter() { throw new Error('SecurityError'); } });
  assert.equal(blocked.readStoredLocale(), null);
  assert.equal(blocked.persistLocale('en'), false);
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
  assert.equal(Object.isFrozen(i18n.DICTIONARY.en.certificate.themes), true);
  const originalTheme = i18n.DICTIONARY.en.certificate.themes.gold;
  i18n.DICTIONARY.en.certificate.themes.gold = 'changed';
  assert.equal(i18n.DICTIONARY.en.certificate.themes.gold, originalTheme);
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
    'header.brandHomeAria', 'header.brandSubtitle', 'landing.timerNote', 'landing.howItWorksLabel',
    'landing.step1Title', 'landing.step1Body', 'landing.step2Title', 'landing.step2Body', 'landing.step3Title', 'landing.step3Body',
    'landing.certificatePreviewLabel', 'landing.previewTitle', 'landing.previewBody', 'landing.previewSampleName',
    'landing.trustLabel', 'landing.trustFree', 'landing.trustNoRegistration', 'landing.trustInstantResult',
    'landing.finalCtaTitle', 'landing.finalCtaButton', 'footer.about', 'footer.privacyLabel',
    'stats.skipped', 'result.pitchSubtitle', 'result.benefit1', 'result.benefit2', 'result.benefit3', 'aria.resultLevel',
    'document.title', 'document.description', 'header.title', 'header.language', 'header.interface',
    'landing.eyebrow', 'landing.title', 'landing.subtitle', 'landing.start', 'landing.duration',
    'languageSelector.title', 'languageSelector.testLanguage', 'languageSelector.uiLanguage', 'languageSelector.continue',
    'consent.text', 'consent.privacy', 'consent.accept', 'socialProof.text', 'timer.label', 'timer.expired',
    'actions.next', 'actions.back', 'actions.finish', 'actions.exit', 'result.title', 'result.level', 'result.score', 'result.subject', 'result.scope',
    'question.progress', 'question.of', 'question.select', 'certificate.title', 'certificate.language', 'certificate.theme', 'certificate.download', 'certificate.print', 'certificate.save', 'certificate.filename',
    'name.label', 'name.optional', 'alerts.copySuccess', 'alerts.copyError', 'sharing.title', 'sharing.webShareTitle', 'sharing.resultPayload', 'sharing.copied', 'sharing.clipboardPrompt',
    'resultCta.title', 'resultCta.text', 'resultCta.open', 'aria.languageMenu', 'aria.close', 'aria.progress', 'aria.timer',
    'alt.logo', 'alt.certificate', 'title.retry', 'title.close', 'title.copy',
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

test('composes certificate completion copy with the assessed language for all five tests', () => {
  const i18n = loadI18n();
  const expected = {
    en: { en: 'completed the Phraseman English Level Check', de: 'completed the Phraseman German Level Check', fr: 'completed the Phraseman French Level Check', it: 'completed the Phraseman Italian Level Check', es: 'completed the Phraseman Spanish Level Check' },
    ru: { en: 'за прохождение проверки уровня английского языка Phraseman', de: 'за прохождение проверки уровня немецкого языка Phraseman', fr: 'за прохождение проверки уровня французского языка Phraseman', it: 'за прохождение проверки уровня итальянского языка Phraseman', es: 'за прохождение проверки уровня испанского языка Phraseman' },
  };
  for (const locale of i18n.UI_LOCALES) for (const code of i18n.TEST_LANGUAGES) {
    assert.equal(i18n.t(locale, 'certificate.completed', { language: i18n.TESTS[code].certificateNames[locale] }), expected[locale][code]);
  }
});

test('loads the versioned i18n core before the certificate and application scripts', () => {
  const html = fs.readFileSync(require.resolve('../knowly-www/english-level-test/index.html'), 'utf8');
  const i18nScript = html.indexOf('./i18n.js?v=20260801-2');
  const certificateScript = html.indexOf('./certificate.js?v=20260801-2');
  const appScript = html.indexOf('./app.js?v=20260801-2');
  assert.ok(i18nScript >= 0, 'the i18n script is versioned');
  assert.ok(i18nScript < certificateScript, 'i18n loads before certificate.js');
  assert.ok(certificateScript < appScript, 'certificate.js loads before app.js');
});

test('declares a real accessible locale toggle and five native-language landing choices', () => {
  const source = fs.readFileSync(require.resolve('../knowly-www/english-level-test/app.js'), 'utf8');
  assert.match(source, /class="elt-ui-locale-toggle"/);
  assert.match(source, /<svg[^>]*viewBox="0 0 24 24"[\s\S]*?<circle/);
  assert.match(source, /aria-label="\$\{copy\('aria\.localeToggle'\)\}"/);
  assert.match(source, /title="\$\{copy\('aria\.localeToggle'\)\}"/);
  assert.match(source, /data-test-language="\$\{code\}"/);
  assert.match(source, /aria-pressed="\$\{code === selectedTestLanguage\}"/);
  assert.match(source, /EnglishTestI18n\.TESTS\[code\]\.nativeLabel/);
  assert.doesNotMatch(source, /[\u{1F1E6}-\u{1F1FF}]{2}/u, 'language controls do not use flag emoji');
});

test('keeps selection mutable only on landing and safely updates the URL without a reload', () => {
  const source = fs.readFileSync(require.resolve('../knowly-www/english-level-test/app.js'), 'utf8');
  const styles = fs.readFileSync(require.resolve('../knowly-www/english-level-test/styles.css'), 'utf8');
  assert.match(source, /uiLocale = EnglishTestI18n\.resolveUiLocale\(\{ search: location\.search, stored: readStoredLocale\(\), navigatorLanguage: navigator\.language \}\);/);
  assert.match(source, /selectedTestLanguage = EnglishTestI18n\.resolveTestLanguage\(location\.search\);/);
  assert.match(source, /let attemptTestLanguage = null;/);
  assert.match(source, /EnglishTestI18n\.updateUrlSelection\(\{[\s\S]*historyObject:[\s\S]*replaceState/);
  assert.match(source, /attemptTestLanguage = selectedTestLanguage/);
  assert.match(source, /if \(attemptTestLanguage !== null \|\| !EnglishTestI18n\.TEST_LANGUAGES\.includes\(code\)\) return;/);
  assert.match(source, /typeof document\.querySelector === 'function'/);
  assert.match(styles, /\.elt-ui-locale-toggle[\s\S]*min-width:\s*44px[\s\S]*min-height:\s*44px/);
  assert.match(styles, /\.elt-ui-locale-toggle:focus-visible/);
  assert.match(styles, /\.elt-ui-locale-toggle:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--text\)/);
  assert.match(styles, /\.elt-language-options[\s\S]*flex-wrap:\s*wrap/);
  assert.match(styles, /\.elt-language-option--active[\s\S]*border[^}]*[\s\S]*color:/);
  assert.match(styles, /\.elt-language-option:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--text\)/);
  assert.doesNotMatch(styles, /elt-language-(?:carousel|scroll)/);
});

test('runs the real landing controls through test selection, locale persistence, and attempt locking', () => {
  const fixture = loadLandingApp();
  assert.equal(fixture.view().querySelectorAll('[data-test-language]').length, 5);
  assert.deepEqual(fixture.view().querySelectorAll('[data-test-language]').map((button) => button.dataset.testLanguage), ['en', 'de', 'fr', 'it', 'es']);
  assert.match(fixture.view().innerHTML, /Find your English level/);
  assert.match(loadLandingApp({ href: 'https://example.test/level?ui=en&test=fr' }).view().innerHTML, /Find your French level/);

  fixture.view().querySelectorAll('[data-test-language]').find((button) => button.dataset.testLanguage === 'de').click();
  assert.equal(fixture.location.href, 'https://example.test/level?ui=en&test=de');
  assert.match(fixture.view().innerHTML, /Find your German level/);
  assert.equal(fixture.view().querySelectorAll('[data-test-language]').find((button) => button.dataset.testLanguage === 'de').getAttribute('aria-pressed'), 'true');

  fixture.view().querySelector('.elt-ui-locale-toggle').click();
  assert.equal(fixture.storageValues.get('language_test_ui_locale_v1'), 'ru');
  assert.equal(fixture.location.href, 'https://example.test/level?ui=ru&test=de');
  assert.equal(fixture.context.document.documentElement.lang, 'ru');
  assert.equal(fixture.context.document.title, 'Тест уровня языка — Phraseman');
  assert.equal(fixture.description.content, 'Узнайте свой уровень языка и получите персональный результат.');
  assert.match(fixture.view().innerHTML, /Определите уровень немецкого языка/);
  assert.match(fixture.view().innerHTML, />RU</);

  const staleFrenchButton = fixture.view().querySelectorAll('[data-test-language]').find((button) => button.dataset.testLanguage === 'fr');
  fixture.view().querySelector('#startBtn').click();
  assert.equal(fixture.view().querySelectorAll('[data-test-language]').length, 0);
  staleFrenchButton.click();
  assert.equal(fixture.location.href, 'https://example.test/level?ui=ru&test=de');
});

test('uses every Russian genitive test-language form after the landing level label', () => {
  const expected = {
    en: 'уровень английского языка',
    de: 'уровень немецкого языка',
    fr: 'уровень французского языка',
    it: 'уровень итальянского языка',
    es: 'уровень испанского языка',
  };
  for (const [code, phrase] of Object.entries(expected)) {
    const fixture = loadLandingApp({ href: `https://example.test/level?ui=ru&test=${code}` });
    assert.match(fixture.view().innerHTML, new RegExp(phrase));
  }
});

test('keeps post-start chrome on its existing Russian surface until all states localize together', () => {
  const source = fs.readFileSync(appPath, 'utf8').replace(
    '  updatePageLocale();\n  renderLanding();',
    "  updatePageLocale();\n  attemptTestLanguage = selectedTestLanguage;\n  renderCTA({ estimatedLevel: 'A1' });",
  );
  const fixture = loadLandingApp({ href: 'https://example.test/level?ui=en&test=de', source });
  assert.equal(fixture.view().querySelectorAll('[data-test-language]').length, 0);
  assert.equal(fixture.view().querySelector('.elt-ui-locale-toggle'), null);
  assert.match(fixture.view().innerHTML, /Живой английский/);
  assert.match(fixture.view().innerHTML, />О приложении</);
  assert.doesNotMatch(fixture.view().innerHTML, /Real English|Deutsch/);
});

test('behavioral landing checks reject missing control wiring, rerendering, and metadata updates', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  const noTestWire = source.replace("button.addEventListener('click', () => selectTestLanguage(button.dataset.testLanguage));", '');
  const noRerender = source.replace('    renderLanding();\n  }\n\n  function toggleUiLocale', '  }\n\n  function toggleUiLocale');
  const noMetadata = source.replace('    updatePageLocale();\n    updateUrlSelection();', '    updateUrlSelection();');
  for (const broken of [noTestWire, noRerender, noMetadata]) {
    assert.throws(() => {
      const fixture = loadLandingApp({ source: broken });
      fixture.view().querySelectorAll('[data-test-language]').find((button) => button.dataset.testLanguage === 'de').click();
      assert.match(fixture.view().innerHTML, /Find your German level/);
      fixture.view().querySelector('.elt-ui-locale-toggle').click();
      assert.equal(fixture.context.document.documentElement.lang, 'ru');
    });
  }
});
