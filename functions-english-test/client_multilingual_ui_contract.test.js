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
    const classes = new Set((html.match(/\bclass="([^"]*)"/)?.[1] || '').split(/\s+/).filter(Boolean));
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const present = force === undefined ? !classes.has(name) : Boolean(force);
        if (present) classes.add(name); else classes.delete(name);
        return present;
      },
    };
    this.isConnected = true;
    this.checked = false;
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type) { this.listeners.delete(type); }
  click() { this.listeners.get('click')?.({}); }
  appendChild(child) { this.children.push(child); child.parentNode = this; child.ownerDocument = this.ownerDocument; return child; }
  remove() { this.isConnected = false; }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  matches(selector) {
    return (selector.startsWith('.') && this.classList.contains(selector.slice(1)))
      || (selector === '.elt-ui-locale-toggle' && /elt-ui-locale-toggle/.test(this.innerHTML));
  }
  setAttribute(name, value) { this[name] = String(value); }
  getAttribute(name) {
    const match = this.innerHTML.match(new RegExp(`${name}="([^"]*)"`));
    return match ? match[1] : null;
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    if (selector === '[data-magnet]' || selector === '.elt-brand-icon') return [];
    if (selector === '.elt-option') {
      return [...this.innerHTML.matchAll(/<button\b(?=[^>]*\bclass="[^"]*\belt-option\b[^"]*")[^>]*>.*?<\/button>/gs)]
        .map((match, index) => {
          const key = `elt-option-${index}`;
          if (!this.nodes.has(key)) {
            const node = new FakeNode(match[0]);
            node.dataset.index = match[0].match(/data-index="(\d+)"/)?.[1];
            node.ownerDocument = this.ownerDocument;
            this.nodes.set(key, node);
          }
          return this.nodes.get(key);
        });
    }
    if (selector === '.elt-option--picked') {
      return [...this.nodes.values()].filter((node) => node.classList.contains('elt-option--picked'));
    }
    if (selector === '[data-test-language]') {
      return [...this.innerHTML.matchAll(/<button[^>]*data-test-language="([^"]+)"[^>]*>.*?<\/button>/gs)]
        .map((match) => {
          if (!this.nodes.has(match[1])) this.nodes.set(match[1], Object.assign(new FakeNode(match[0]), { dataset: { testLanguage: match[1] }, ownerDocument: this.ownerDocument }));
          return this.nodes.get(match[1]);
        });
    }
    const token = selector.startsWith('#') ? `id="${selector.slice(1)}"`
      : selector.startsWith('.') ? `class="[^"]*${selector.slice(1)}[^"]*"`
        : selector;
    if (!new RegExp(token).test(this.innerHTML)) return [];
    if (!this.nodes.has(selector)) this.nodes.set(selector, Object.assign(new FakeNode(this.innerHTML), { ownerDocument: this.ownerDocument }));
    return [this.nodes.get(selector)];
  }
}

function loadLandingApp({ href = 'https://example.test/level?ui=en', source = fs.readFileSync(appPath, 'utf8') } = {}) {
  const app = new FakeNode();
  const storageValues = new Map();
  const timers = [];
  const intervals = [];
  let nextTimerId = 1;
  const location = { href, get search() { return new URL(this.href).search; } };
  const description = new FakeNode();
  const document = {
    documentElement: new FakeNode(),
    activeElement: null,
    title: '',
    visibilityState: 'visible',
    getElementById: () => app,
    createElement: (tag) => {
      if (tag === 'div') {
        const div = new FakeNode();
        Object.defineProperty(div, 'textContent', { set(value) { div.innerHTML = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); } });
        return div;
      }
      const template = { content: {} };
      Object.defineProperty(template, 'innerHTML', { set(value) { template.content.firstElementChild = new FakeNode(value); } });
      return template;
    },
    querySelector: (selector) => selector === 'meta[name="description"]' ? description : null,
    addEventListener() {}, removeEventListener() {},
  };
  app.ownerDocument = document;
  document.documentElement.ownerDocument = document;
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
    EnglishTestEngine: { LEVELS: ['A1', 'A2', 'B1'] },
    console,
    location,
    history,
    document,
    navigator: { language: 'en-US', userAgent: 'test', platform: 'test', maxTouchPoints: 0 },
    localStorage: { getItem: (key) => storageValues.get(key) || null, setItem: (key, value) => storageValues.set(key, String(value)), removeItem: (key) => storageValues.delete(key), get length() { return storageValues.size; }, key: (index) => [...storageValues.keys()][index] || null },
    crypto: { getRandomValues: (values) => values.fill(1) },
    fetch: () => new Promise(() => {}),
    performance: { now: () => 0 },
    requestAnimationFrame: (callback) => { callback(0); return 0; },
    cancelAnimationFrame() {},
    setTimeout: (callback, delay) => {
      const timer = { id: nextTimerId++, callback, delay, cleared: false };
      timers.push(timer);
      return timer.id;
    },
    clearTimeout(id) { const timer = timers.find((candidate) => candidate.id === id); if (timer) timer.cleared = true; },
    setInterval: (callback, delay) => {
      const interval = { id: nextTimerId++, callback, delay, cleared: false };
      intervals.push(interval);
      return interval.id;
    },
    clearInterval(id) { const interval = intervals.find((candidate) => candidate.id === id); if (interval) interval.cleared = true; },
    window: { matchMedia: () => ({ matches: true }), addEventListener() {}, scrollTo() {} },
  };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), context, { filename: modulePath });
  vm.runInNewContext(source, context, { filename: appPath });
  return {
    app, context, description, location, storageValues,
    view: () => app.children.at(-1),
    pendingTimeouts: (delay) => timers.filter((timer) => !timer.cleared && timer.delay === delay),
    flushTimeouts: (delay) => timers.filter((timer) => !timer.cleared && timer.delay === delay).forEach((timer) => {
      timer.cleared = true;
      timer.callback();
    }),
    intervals,
  };
}

function loadI18n(globals = {}) {
  const source = fs.readFileSync(modulePath, 'utf8');
  const { localStorageGetter, ...values } = globals;
  const context = vm.createContext({ URL, URLSearchParams, ...values });
  if (localStorageGetter) Object.defineProperty(context, 'localStorage', { configurable: true, get: localStorageGetter });
  vm.runInContext(source, context, { filename: modulePath });
  return context.EnglishTestI18n;
}

function loadLocaleStateApp({ source = fs.readFileSync(appPath, 'utf8') } = {}) {
  const tail = `
  const __localeEffects = { api: [], completion: 0, certificate: 0, compute: 0, fetch: [] };
  api = (action) => { __localeEffects.api.push(action); return null; };
  fetch = (url) => { __localeEffects.fetch.push(String(url)); return Promise.resolve({ ok: true, json: async () => ({}) }); };
  reportTestCompletion = () => { __localeEffects.completion += 1; };
  generateCertificate = () => { __localeEffects.certificate += 1; };
  window.__localeStateTest = {
    enterQuestion(question, locked) {
      attemptTestLanguage = 'de';
      engine = { history: [{ questionId: 'earlier' }], targetLevelIndex: 1, computeResult() { __localeEffects.compute += 1; return {}; } };
      currentQuestion = question;
      selectedAnswerIndex = locked ? 1 : null;
      answerLocked = Boolean(locked);
      questionDeadline = Date.now() + 32000;
      questionStartTime = Date.now() - 13000;
      lastProgress = 5;
      renderQuestion(question, { preserveAttempt: true });
    },
    enterResult(result) { attemptTestLanguage = 'de'; renderResult(result); },
    state() { return { currentQuestion, questionDeadline, questionStartTime, history: engine?.history || null, selectedAnswerIndex, answerLocked, lastProgress, activeView }; },
    effects() { return JSON.parse(JSON.stringify(__localeEffects)); },
  };
})();`;
  const instrumented = source.replace(/  updatePageLocale\(\);\r?\n  renderLanding\(\);\r?\n\}\)\(\);\s*$/, `  updatePageLocale();${tail}`);
  assert.notEqual(instrumented, source, 'test injection must replace only the production initialization tail');
  const fixture = loadLandingApp({ source: instrumented });
  return fixture;
}

function loadBankLoaderApp({ href = 'https://example.test/level?ui=en&test=en', source = fs.readFileSync(appPath, 'utf8'), realStartFlow = false } = {}) {
  const tail = `
  const __bankLoaderEffects = { requests: [], analytics: [], engines: 0, starts: [], questions: 0, tokens: 0 };
  let __bankLoaderResponse = null;
  fetch = (url, options) => {
    if (url === API_BASE) {
      __bankLoaderEffects.analytics.push(JSON.parse(options.body));
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    }
    __bankLoaderEffects.requests.push(String(url));
    return __bankLoaderResponse(url);
  };
  if (!${realStartFlow}) {
    api = (action) => { __bankLoaderEffects.starts.push(action); return null; };
    showNextQuestion = () => { __bankLoaderEffects.questions += 1; };
  }
  const __originalGenerateToken = generateToken;
  generateToken = () => { __bankLoaderEffects.tokens += 1; return __originalGenerateToken(); };
  EnglishTestEngine.Engine = function(questionSet) {
    __bankLoaderEffects.engines += 1;
    this.questions = questionSet;
    this.history = [];
    this.shouldFinish = () => false;
    this.pickNextQuestion = () => ({ id: 'first', scenarioRu: 'ru', instructionRu: 'instruction', scenario: 'scenario', prompt: 'prompt', options: ['a', 'b'], correctIndex: 0, level: 'A1' });
  };
  window.__bankLoaderTest = {
    select: (language) => selectTestLanguage(language),
    start: () => startTest(),
    setResponse: (response) => { __bankLoaderResponse = response; },
    setConsent: (value) => { consent = value; if (value) localStorage.setItem(ANALYTICS_BROWSER_ID_KEY, 'a'.repeat(48)); },
    load: (language) => typeof loadBank === 'function' ? loadBank(language) : Promise.reject(new Error('loadBank missing')),
    pendingStart: () => startPromise,
    state: () => ({ attemptTestLanguage, selectedTestLanguage, activeView, cacheSize: typeof bankCache === 'undefined' ? null : bankCache.size, effects: JSON.parse(JSON.stringify(__bankLoaderEffects)) }),
  };
})();`;
  const instrumented = source.replace(/  updatePageLocale\(\);\r?\n  renderLanding\(\);\r?\n\}\)\(\);\s*$/, `  updatePageLocale();${tail}`);
  assert.notEqual(instrumented, source, 'bank-loader injection must replace only the production initialization tail');
  return loadLandingApp({ href, source: instrumented });
}

function validBank(language, version = '2026-08-01.1') {
  return {
    language,
    bankVersion: version,
    questions: Array.from({ length: 240 }, (_, index) => ({ id: `${language}-${index}` })),
  };
}

function loadKeyboardStateApp({ source = fs.readFileSync(appPath, 'utf8') } = {}) {
  const tail = `
  const __keyboardEffects = { api: [], answers: [] };
  api = (action, payload) => { __keyboardEffects.api.push({ action, payload }); return null; };
  reportTestCompletion = () => {};
  window.__keyboardStateTest = {
    enterQuestion(question) {
      attemptTestLanguage = 'de';
      consent = true;
      engine = {
        history: [],
        targetLevelIndex: 1,
        shouldFinish() { return this.history.length > 0; },
        pickNextQuestion() { return null; },
        recordAnswer(answeredQuestion, selectedIndex, skipped) {
          this.history.push({ questionId: answeredQuestion.id, selectedIndex, skipped });
          __keyboardEffects.answers.push({ questionId: answeredQuestion.id, selectedIndex, skipped });
        },
        computeResult() { return { estimatedLevel: 'A1', correct: 1, answered: 1, totalQuestions: 1, skipped: 0, assessmentScope: 'test', stopReason: 'test' }; },
      };
      currentQuestion = question;
      selectedAnswerIndex = null;
      answerLocked = false;
      questionDeadline = Date.now() + 32000;
      questionStartTime = Date.now() - 13000;
      lastProgress = 0;
      renderQuestion(question, { preserveAttempt: true });
      startQuestionTimer();
    },
    enterCrossfadeQuestions(firstQuestion, secondQuestion) {
      attemptTestLanguage = 'de';
      consent = true;
      engine = {
        history: [],
        targetLevelIndex: 1,
        shouldFinish() { return this.history.length >= 2; },
        pickNextQuestion() { return this.history.length === 1 ? secondQuestion : null; },
        recordAnswer(answeredQuestion, selectedIndex, skipped) {
          this.history.push({ questionId: answeredQuestion.id, selectedIndex, skipped });
          __keyboardEffects.answers.push({ questionId: answeredQuestion.id, selectedIndex, skipped });
        },
        computeResult() { return { estimatedLevel: 'A1', correct: 1, answered: 2, totalQuestions: 2, skipped: 0, assessmentScope: 'test', stopReason: 'test' }; },
      };
      currentQuestion = firstQuestion;
      selectedAnswerIndex = null;
      answerLocked = false;
      questionDeadline = Date.now() + 32000;
      questionStartTime = Date.now() - 13000;
      lastProgress = 0;
      renderQuestion(firstQuestion, { preserveAttempt: true });
      startQuestionTimer();
    },
    expireDeadline() { questionDeadline = Date.now() - 1; activeTimerTick(); },
    state() { return { selectedAnswerIndex, answerLocked, history: engine?.history || null }; },
    effects() { return JSON.parse(JSON.stringify(__keyboardEffects)); },
  };
})();`;
  const instrumented = source.replace(/  updatePageLocale\(\);\r?\n  renderLanding\(\);\r?\n\}\)\(\);\s*$/, `  updatePageLocale();${tail}`);
  assert.notEqual(instrumented, source, 'keyboard test injection must replace only the production initialization tail');
  return loadLandingApp({ source: instrumented });
}

function keydown(fixture, key) {
  let prevented = false;
  fixture.app.listeners.get('keydown')?.({ key, preventDefault() { prevented = true; } });
  const focused = fixture.context.document.activeElement;
  if (!prevented && (key === 'Enter' || key === ' ') && focused?.classList?.contains('elt-option')) focused.click();
  return prevented;
}

function assertKeyboardAnswerRaceIsLocked(fixture) {
  const question = { id: 'keyboard-race', scenarioRu: 'ru', instructionRu: 'instruction', scenario: 'scenario', prompt: 'prompt', options: ['first', 'second'], correctIndex: 0, level: 'A1' };
  fixture.context.window.__keyboardStateTest.enterQuestion(question);
  const options = fixture.view().querySelectorAll('.elt-option');

  assert.equal(keydown(fixture, '1'), true);
  assert.equal(fixture.context.window.__keyboardStateTest.state().selectedAnswerIndex, 0);
  assert.equal(fixture.context.window.__keyboardStateTest.state().answerLocked, true);
  assert.equal(options[0].classList.contains('elt-option--picked'), true);
  assert.equal(fixture.pendingTimeouts(200).length, 1);

  assert.equal(keydown(fixture, '1'), false);
  options[1].click();
  fixture.context.window.__keyboardStateTest.expireDeadline();
  assert.equal(fixture.context.window.__keyboardStateTest.state().selectedAnswerIndex, 0);
  assert.equal(fixture.pendingTimeouts(200).length, 1);

  fixture.flushTimeouts(200);
  const effects = fixture.context.window.__keyboardStateTest.effects();
  assert.deepEqual(effects.answers, [{ questionId: 'keyboard-race', selectedIndex: 0, skipped: false }]);
  assert.equal(effects.api.filter(({ action }) => action === 'progress').length, 1);
}

function assertSpaceFirstAnswerIsLocked(fixture) {
  const question = { id: 'space-first', scenarioRu: 'ru', instructionRu: 'instruction', scenario: 'scenario', prompt: 'prompt', options: ['first', 'second'], correctIndex: 1, level: 'A1' };
  fixture.context.window.__keyboardStateTest.enterQuestion(question);
  const options = fixture.view().querySelectorAll('.elt-option');

  options[1].focus();
  assert.equal(keydown(fixture, ' '), true);
  assert.equal(fixture.context.window.__keyboardStateTest.state().selectedAnswerIndex, 1);
  assert.equal(fixture.context.window.__keyboardStateTest.state().answerLocked, true);
  assert.equal(fixture.pendingTimeouts(200).length, 1);

  assert.equal(keydown(fixture, '1'), false);
  options[0].click();
  assert.equal(fixture.context.window.__keyboardStateTest.state().selectedAnswerIndex, 1);
  assert.equal(fixture.pendingTimeouts(200).length, 1);

  fixture.flushTimeouts(200);
  assert.deepEqual(fixture.context.window.__keyboardStateTest.effects().answers, [{ questionId: 'space-first', selectedIndex: 1, skipped: false }]);
}

function assertStaleCrossfadeFocusIsIgnored(fixture) {
  const firstQuestion = { id: 'crossfade-first', scenarioRu: 'ru', instructionRu: 'instruction', scenario: 'scenario', prompt: 'prompt', options: ['first', 'second'], correctIndex: 0, level: 'A1' };
  const secondQuestion = { id: 'crossfade-second', scenarioRu: 'ru', instructionRu: 'instruction', scenario: 'scenario', prompt: 'prompt', options: ['third', 'fourth'], correctIndex: 1, level: 'A1' };
  fixture.context.window.__keyboardStateTest.enterCrossfadeQuestions(firstQuestion, secondQuestion);
  const outgoingView = fixture.view();
  const outgoingOption = outgoingView.querySelectorAll('.elt-option')[0];

  outgoingOption.focus();
  assert.equal(keydown(fixture, 'Enter'), true);
  fixture.flushTimeouts(200);
  assert.equal(fixture.context.window.__keyboardStateTest.effects().answers.length, 1);
  assert.equal(outgoingView.getAttribute('aria-hidden'), 'true');
  assert.equal(outgoingView.isConnected, true);
  assert.equal(fixture.context.document.activeElement, outgoingOption);

  assert.equal(keydown(fixture, ' '), true);
  assert.equal(keydown(fixture, 'Enter'), true);
  outgoingOption.click();
  assert.equal(fixture.context.window.__keyboardStateTest.state().selectedAnswerIndex, null);
  assert.equal(fixture.context.window.__keyboardStateTest.state().answerLocked, false);
  assert.equal(fixture.pendingTimeouts(200).length, 0);
  assert.equal(fixture.context.window.__keyboardStateTest.effects().answers.length, 1);

  const currentOption = fixture.view().querySelectorAll('.elt-option')[1];
  currentOption.focus();
  assert.equal(keydown(fixture, ' '), true);
  assert.equal(fixture.context.window.__keyboardStateTest.state().selectedAnswerIndex, 1);
  assert.equal(fixture.context.window.__keyboardStateTest.state().answerLocked, true);
  assert.equal(fixture.pendingTimeouts(200).length, 1);
  fixture.flushTimeouts(200);
  assert.deepEqual(fixture.context.window.__keyboardStateTest.effects().answers, [
    { questionId: 'crossfade-first', selectedIndex: 0, skipped: false },
    { questionId: 'crossfade-second', selectedIndex: 1, skipped: false },
  ]);
}

function leafPaths(value, prefix = '') {
  if (typeof value === 'string') return [prefix];
  return Object.keys(value).flatMap((key) => leafPaths(value[key], prefix ? `${prefix}.${key}` : key));
}

function assertNoBannedVisibleLiterals(source) {
  const banned = ['Начать бесплатно', 'Не знаю', 'Выйти', 'Верно', 'Создать сертификат', 'Поделиться', 'Пройти тест ещё раз', 'Start free', "I don't know", 'Exit', 'Correct', 'Create certificate', 'Share', 'Take the test again'];
  for (const literal of banned) {
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.doesNotMatch(source, new RegExp(`(?:['\"]${escaped}['\"]|>${escaped}<)`), `${literal} must be obtained through copy()`);
  }
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

test('loads only the frozen selected bank and rejects malformed bank roots without an English fallback', async () => {
  const i18n = loadI18n();
  for (const language of i18n.TEST_LANGUAGES) {
    const fixture = loadBankLoaderApp({ href: `https://example.test/level?ui=en&test=${language}` });
    fixture.context.window.__bankLoaderTest.setResponse(async (url) => ({ ok: true, json: async () => validBank(language) }));
    await fixture.context.window.__bankLoaderTest.start();
    const state = fixture.context.window.__bankLoaderTest.state();
    assert.deepEqual(state.effects.requests, [i18n.TESTS[language].bankUrl]);
    assert.equal(state.attemptTestLanguage, language);
    assert.equal(state.effects.engines, 1);
  }

  const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de' });
  fixture.context.window.__bankLoaderTest.setResponse(async () => ({ ok: true, json: async () => validBank('en') }));
  await fixture.context.window.__bankLoaderTest.start();
  const state = fixture.context.window.__bankLoaderTest.state();
  assert.equal(state.activeView.kind, 'error');
  assert.deepEqual(state.effects.requests, [i18n.TESTS.de.bankUrl]);
  assert.equal(state.effects.engines, 0);
});

test('shares one in-flight selected-bank request, evicts a failed request, and reuses a successful bank', async () => {
  const i18n = loadI18n();
  const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de' });
  let resolveFirst;
  fixture.context.window.__bankLoaderTest.setResponse(() => new Promise((resolve) => { resolveFirst = resolve; }));
  const first = fixture.context.window.__bankLoaderTest.start();
  const second = fixture.context.window.__bankLoaderTest.start();
  assert.equal(fixture.context.window.__bankLoaderTest.state().effects.requests.length, 1);
  resolveFirst({ ok: true, json: async () => validBank('de') });
  await Promise.all([first, second]);
  assert.equal(fixture.context.window.__bankLoaderTest.state().effects.engines, 1);

  const failed = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de' });
  let calls = 0;
  failed.context.window.__bankLoaderTest.setResponse(async () => {
    calls += 1;
    return calls === 1
      ? { ok: false, status: 503, json: async () => ({}) }
      : { ok: true, json: async () => validBank('de') };
  });
  await failed.context.window.__bankLoaderTest.start();
  await failed.context.window.__bankLoaderTest.start();
  assert.equal(calls, 2);
  assert.deepEqual(failed.context.window.__bankLoaderTest.state().effects.requests, [i18n.TESTS.de.bankUrl, i18n.TESTS.de.bankUrl]);
  assert.equal(failed.context.window.__bankLoaderTest.state().effects.engines, 1);
});

test('enforces the bounded bank contract and never caches an unknown or rejected language', async () => {
  const i18n = loadI18n();
  const invalidBanks = [
    { language: 'en', bankVersion: 'v1', questions: validBank('de').questions },
    { language: 'de', bankVersion: 'v1' },
    { language: 'de', bankVersion: 'v1', questions: validBank('de').questions.slice(0, 239) },
    { language: 'de', bankVersion: 'v1', questions: [...validBank('de').questions, {}] },
    { language: 'de', bankVersion: 'v1', questions: validBank('de').questions },
    { language: 'de', bankVersion: '20260801-1', questions: validBank('de').questions },
    { language: 'de', bankVersion: ' 2026-08-01.1', questions: validBank('de').questions },
    { language: 'de', bankVersion: '2026-08-01.1 ', questions: validBank('de').questions },
    { language: 'de', bankVersion: '2026-08-01.1x', questions: validBank('de').questions },
    { language: 'de', bankVersion: '2026-08-01.', questions: validBank('de').questions },
    { language: 'de', bankVersion: `2026-08-01.${'1'.repeat(22)}`, questions: validBank('de').questions },
    { language: 'de', bankVersion: ' ', questions: validBank('de').questions },
    { language: 'de', bankVersion: 'v'.repeat(129), questions: validBank('de').questions },
  ];
  for (const bank of invalidBanks) {
    const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de' });
    fixture.context.window.__bankLoaderTest.setResponse(async () => ({ ok: true, json: async () => bank }));
    await assert.rejects(fixture.context.window.__bankLoaderTest.load('de'), /bank_contract_mismatch/);
    assert.equal(fixture.context.window.__bankLoaderTest.state().cacheSize, 0);
  }

  const fixture = loadBankLoaderApp();
  fixture.context.window.__bankLoaderTest.setResponse(async (url) => {
    const language = /questions\.([a-z]{2})\.json/.exec(url)[1];
    return { ok: true, json: async () => validBank(language) };
  });
  await assert.rejects(fixture.context.window.__bankLoaderTest.load('xx'), /bank_contract_mismatch/);
  assert.deepEqual(fixture.context.window.__bankLoaderTest.state().effects.requests, []);
  for (const language of i18n.TEST_LANGUAGES) await fixture.context.window.__bankLoaderTest.load(language);
  assert.equal(fixture.context.window.__bankLoaderTest.state().cacheSize, i18n.TEST_LANGUAGES.length);
});

test('client bank-version validation exactly mirrors the server grammar and 32-character bound', async () => {
  const server = fs.readFileSync(require.resolve('./index.js'), 'utf8');
  const client = fs.readFileSync(appPath, 'utf8');
  assert.match(server, /value\.length > 32/);
  assert.match(server, /\^\\d\{4\}-\\d\{2\}-\\d\{2\}\\\.\\d\+\$/);
  assert.match(client, /MAX_BANK_VERSION_LENGTH = 32/);
  assert.match(client, /BANK_VERSION_PATTERN = \/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\\\.\\d\+\$\//);

  for (const version of ['2026-07-22.4', '2026-08-01.1', `2026-08-01.${'1'.repeat(21)}`]) {
    const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de' });
    fixture.context.window.__bankLoaderTest.setResponse(async () => ({ ok: true, json: async () => validBank('de', version) }));
    await fixture.context.window.__bankLoaderTest.load('de');
  }
});

test('concurrent consented starts share one request, attempt token, engine, analytics sequence, and first view', async () => {
  const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de', realStartFlow: true });
  let resolve;
  fixture.context.window.__bankLoaderTest.setConsent(true);
  fixture.context.window.__bankLoaderTest.setResponse(() => new Promise((done) => { resolve = done; }));
  const first = fixture.context.window.__bankLoaderTest.start();
  const second = fixture.context.window.__bankLoaderTest.start();
  assert.strictEqual(first, second);
  assert.equal(fixture.context.window.__bankLoaderTest.state().effects.requests.length, 1);
  resolve({ ok: true, json: async () => validBank('de') });
  const outcomes = await Promise.allSettled([first, second]);
  assert.deepEqual(outcomes.map((outcome) => outcome.status), ['fulfilled', 'fulfilled']);
  await Promise.resolve();
  const effects = fixture.context.window.__bankLoaderTest.state().effects;
  assert.equal(effects.tokens, 1);
  assert.equal(effects.engines, 1);
  assert.deepEqual(effects.analytics.map((entry) => entry.action), ['landing', 'start', 'view']);
  assert.equal(new Set(effects.analytics.map((entry) => entry.attemptToken)).size, 1);
});

test('successful banks retain identity for reuse while the allowlisted cache stays bounded', async () => {
  const i18n = loadI18n();
  const fixture = loadBankLoaderApp();
  fixture.context.window.__bankLoaderTest.setResponse(async (url) => {
    const language = /questions\.([a-z]{2})\.json/.exec(url)[1];
    return { ok: true, json: async () => validBank(language) };
  });
  const first = await fixture.context.window.__bankLoaderTest.load('de');
  const second = await fixture.context.window.__bankLoaderTest.load('de');
  assert.strictEqual(second, first);
  assert.equal(fixture.context.window.__bankLoaderTest.state().effects.requests.length, 1);
  for (const language of i18n.TEST_LANGUAGES) await fixture.context.window.__bankLoaderTest.load(language);
  assert.equal(fixture.context.window.__bankLoaderTest.state().cacheSize, 5);
  await assert.rejects(fixture.context.window.__bankLoaderTest.load('xx'), /bank_contract_mismatch/);
  assert.equal(fixture.context.window.__bankLoaderTest.state().cacheSize, 5);
});

test('all invalid response forms render a localized error with no engine or analytics', async () => {
  const cases = [
    async () => ({ ok: false, json: async () => ({}) }),
    async () => ({ ok: true, json: async () => { throw new Error('not json'); } }),
    async () => ({ ok: true, json: async () => validBank('en') }),
    async () => ({ ok: true, json: async () => ({ ...validBank('de'), questions: validBank('de').questions.slice(0, 239) }) }),
    async () => ({ ok: true, json: async () => ({ ...validBank('de'), questions: [...validBank('de').questions, {}] }) }),
    async () => ({ ok: true, json: async () => validBank('de', 'v1') }),
  ];
  for (const response of cases) {
    const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de', realStartFlow: true });
    fixture.context.window.__bankLoaderTest.setConsent(true);
    fixture.context.window.__bankLoaderTest.setResponse(response);
    await fixture.context.window.__bankLoaderTest.start();
    const state = fixture.context.window.__bankLoaderTest.state();
    assert.equal(state.activeView.kind, 'error');
    assert.equal(state.effects.engines, 0);
    assert.deepEqual(state.effects.analytics, []);
  }
});

test('German error rerenders locally and retries German only after a failed request is evicted', async () => {
  const i18n = loadI18n();
  const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de' });
  let calls = 0;
  fixture.context.window.__bankLoaderTest.setResponse(async () => {
    calls += 1;
    return calls === 1 ? { ok: false, json: async () => ({}) } : { ok: true, json: async () => validBank('de') };
  });
  await fixture.context.window.__bankLoaderTest.start();
  const englishError = fixture.view().innerHTML;
  fixture.view().querySelector('.elt-ui-locale-toggle').click();
  assert.equal(fixture.context.window.__bankLoaderTest.state().attemptTestLanguage, 'de');
  assert.notEqual(fixture.view().innerHTML, englishError);
  assert.deepEqual(fixture.context.window.__bankLoaderTest.state().effects.requests, [i18n.TESTS.de.bankUrl]);
  fixture.view().querySelector('#retryBtn').click();
  await fixture.context.window.__bankLoaderTest.pendingStart();
  assert.deepEqual(fixture.context.window.__bankLoaderTest.state().effects.requests, [i18n.TESTS.de.bankUrl, i18n.TESTS.de.bankUrl]);
  assert.equal(fixture.context.window.__bankLoaderTest.state().effects.engines, 1);
});

test('concurrent rejected starts share one failed request and a later retry creates one new request', async () => {
  const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de' });
  let resolve;
  let calls = 0;
  fixture.context.window.__bankLoaderTest.setResponse(() => {
    calls += 1;
    if (calls === 1) return new Promise((done) => { resolve = done; });
    return Promise.resolve({ ok: true, json: async () => validBank('de') });
  });
  const first = fixture.context.window.__bankLoaderTest.start();
  const second = fixture.context.window.__bankLoaderTest.start();
  assert.strictEqual(first, second);
  resolve({ ok: false, json: async () => ({}) });
  const outcomes = await Promise.allSettled([first, second]);
  assert.deepEqual(outcomes.map((outcome) => outcome.status), ['fulfilled', 'fulfilled']);
  assert.equal(calls, 1);
  assert.equal(fixture.context.window.__bankLoaderTest.state().cacheSize, 0);
  await fixture.context.window.__bankLoaderTest.start();
  assert.equal(calls, 2);
  assert.equal(fixture.context.window.__bankLoaderTest.state().effects.engines, 1);
});

test('executed bank-loader mutation packets each break the production behavioral harness', async () => {
  const source = fs.readFileSync(appPath, 'utf8');
  const deUrl = loadI18n().TESTS.de.bankUrl;
  const expectMutationFailure = async (name, mutate, exercise) => {
    const mutated = mutate(source);
    assert.notEqual(mutated, source, `${name} mutation must alter production source`);
    await assert.rejects(() => exercise(mutated), assert.AssertionError, name);
  };

  await expectMutationFailure('hardcoded English URL',
    (value) => value.replace('fetch(EnglishTestI18n.TESTS[language].bankUrl)', 'fetch(EnglishTestI18n.TESTS.en.bankUrl)'),
    async (mutated) => {
      const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de', source: mutated });
      fixture.context.window.__bankLoaderTest.setResponse(async () => ({ ok: true, json: async () => validBank('de') }));
      await fixture.context.window.__bankLoaderTest.start();
      assert.deepEqual(fixture.context.window.__bankLoaderTest.state().effects.requests, [deUrl]);
    });
  await expectMutationFailure('English fallback after German failure',
    (value) => value.replace("if (!res.ok) throw new Error('bank_contract_mismatch');", "if (!res.ok) { const fallback = await fetch(EnglishTestI18n.TESTS.en.bankUrl); return validateBank('en', await fallback.json()); }"),
    async (mutated) => {
      const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de', source: mutated });
      fixture.context.window.__bankLoaderTest.setResponse(async (url) => ({ ok: url === deUrl ? false : true, json: async () => validBank('en') }));
      await assert.rejects(fixture.context.window.__bankLoaderTest.load('de'), /bank_contract_mismatch/);
    });
  for (const [name, packet, bank] of [
    ['language validation', 'bank.language !== language', validBank('en')],
    ['exact-240 validation', 'bank.questions.length !== 240', { ...validBank('de'), questions: validBank('de').questions.slice(0, 239) }],
    ['version validation', '!isValidBankVersion(bank.bankVersion)', validBank('de', 'v1')],
  ]) {
    await expectMutationFailure(`removed ${name}`,
      (value) => value.replace(packet, 'false'),
      async (mutated) => {
        const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de', source: mutated });
        fixture.context.window.__bankLoaderTest.setResponse(async () => ({ ok: true, json: async () => bank }));
        await assert.rejects(fixture.context.window.__bankLoaderTest.load('de'), /bank_contract_mismatch/);
      });
  }
  await expectMutationFailure('retained rejected cache entry',
    (value) => value.replace('if (bankCache.get(language) === request) bankCache.delete(language);', 'void language;'),
    async (mutated) => {
      const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de', source: mutated });
      fixture.context.window.__bankLoaderTest.setResponse(async () => ({ ok: false, json: async () => ({}) }));
      await assert.rejects(fixture.context.window.__bankLoaderTest.load('de'));
      await assert.rejects(fixture.context.window.__bankLoaderTest.load('de'));
      assert.equal(fixture.context.window.__bankLoaderTest.state().effects.requests.length, 2);
    });
  await expectMutationFailure('late in-flight cache insertion',
    (value) => value.replace('bankCache.set(language, request);', 'request.then(() => bankCache.set(language, request));'),
    async (mutated) => {
      const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de', source: mutated });
      fixture.context.window.__bankLoaderTest.setResponse(() => new Promise(() => {}));
      void fixture.context.window.__bankLoaderTest.load('de');
      void fixture.context.window.__bankLoaderTest.load('de');
      assert.equal(fixture.context.window.__bankLoaderTest.state().effects.requests.length, 1);
    });
});

test('locale toggles during a selected-bank load keep the frozen attempt and do not refetch', async () => {
  const i18n = loadI18n();
  const fixture = loadBankLoaderApp({ href: 'https://example.test/level?ui=en&test=de' });
  let resolve;
  fixture.context.window.__bankLoaderTest.setResponse(() => new Promise((done) => { resolve = done; }));
  const loading = fixture.context.window.__bankLoaderTest.start();
  fixture.view().querySelector('.elt-ui-locale-toggle').click();
  assert.equal(fixture.context.window.__bankLoaderTest.state().attemptTestLanguage, 'de');
  assert.deepEqual(fixture.context.window.__bankLoaderTest.state().effects.requests, [i18n.TESTS.de.bankUrl]);
  resolve({ ok: true, json: async () => validBank('de') });
  await loading;
  assert.deepEqual(fixture.context.window.__bankLoaderTest.state().effects.requests, [i18n.TESTS.de.bankUrl]);
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
  assert.ok(fixture.view().querySelector('.elt-ui-locale-toggle'));
  assert.match(fixture.view().innerHTML, /Real English/);
  assert.match(fixture.view().innerHTML, />About the app</);
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

test('owns an explicit active view and rerenders every localized surface without restarting an attempt', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  assert.match(source, /let activeView\s*=\s*\{\s*kind:\s*'landing'/);
  assert.match(source, /function setActiveView\(kind, data\)/);
  assert.match(source, /function rerenderForUiLocale\(\)/);
  assert.match(source, /renderQuestion\(activeView\.data,\s*\{\s*preserveAttempt:\s*true\s*\}\)/);
  assert.match(source, /renderResult\(activeView\.data,\s*\{\s*preserveAttempt:\s*true\s*\}\)/);
  assert.match(source, /renderCTA\(activeView\.data,\s*\{\s*preserveAttempt:\s*true\s*\}\)/);
  assert.match(source, /if \(!options\.preserveAttempt\) startQuestionTimer\(\);/);
  assert.match(source, /if \(!options\.preserveAttempt && consent\) api\('cta_view'/);
});

test('uses dictionary copy for service chrome and keeps assessed question content in the test language', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  assertNoBannedVisibleLiterals(source);
  assert.match(source, /copy\('question\.skip'\)/);
  assert.match(source, /copy\('exitConfirm\.title'\)/);
  assert.match(source, /copy\('certificate\.create'\)/);
  assert.match(source, /copy\('sharing\.webShareTitle'\)/);
  assert.match(source, /const questionLanguage = EnglishTestI18n\.TESTS\[attemptTestLanguage \|\| selectedTestLanguage\]\.bcp47/);
  assert.match(source, /class="elt-scenario" lang="\$\{serviceQuestion\.language\}"/);
  assert.match(source, /class="elt-option-text" lang="\$\{questionLanguage\}"/);
  assert.match(source, /<div class="elt-result">\s*\$\{brandHeader\(\)\}/);
  assert.match(source, /const timerLeftMs = options\.preserveAttempt \? Math\.max\(0, questionDeadline - Date\.now\(\)\) : QUESTION_SECONDS \* 1000/);
  assert.match(source, /restoreLocaleToggleFocus/);
});

test('live question toggle preserves attempt state and changes only service instruction locale', () => {
  const fixture = loadLocaleStateApp();
  const question = { id: 'de-q1', scenarioRu: 'RU scenario', instructionRu: 'RU instruction', scenario: 'EN scenario', prompt: 'EN prompt', stimulus: 'DE stimulus', options: ['eins', 'zwei'], correctIndex: 0 };
  fixture.context.window.__localeStateTest.enterQuestion(question, true);
  const before = fixture.context.window.__localeStateTest.state();
  const beforeHtml = fixture.view().innerHTML;
  const beforeTimer = beforeHtml.match(/id="qTimerNum">(\d+)/)[1];
  const beforeRing = beforeHtml.match(/stroke-dashoffset:([\d.]+)/)[1];
  const beforeProgress = fixture.view().querySelector('.elt-progress-fill').style.width;
  const effectsBefore = fixture.context.window.__localeStateTest.effects();
  fixture.view().querySelector('.elt-ui-locale-toggle').click();
  const after = fixture.context.window.__localeStateTest.state();
  const html = fixture.view().innerHTML;
  const effectsAfter = fixture.context.window.__localeStateTest.effects();
  assert.match(beforeHtml, /EN scenario/);
  assert.match(html, /RU scenario/);
  assert.match(html, /lang="ru">RU instruction/);
  assert.match(html, /lang="de-DE">DE stimulus/);
  assert.match(html, /lang="de-DE">eins/);
  assert.equal(after.currentQuestion, before.currentQuestion);
  assert.equal(after.questionDeadline, before.questionDeadline);
  assert.equal(after.questionStartTime, before.questionStartTime);
  assert.deepEqual(after.history, before.history);
  assert.equal(after.selectedAnswerIndex, 1);
  assert.equal(after.answerLocked, true);
  assert.equal(after.lastProgress, before.lastProgress);
  assert.equal(fixture.view().querySelector('.elt-progress-fill').style.width, '10%');
  assert.equal(beforeProgress, '10%');
  assert.ok(Number(html.match(/id="qTimerNum">(\d+)/)[1]) <= Number(beforeTimer));
  assert.notEqual(html.match(/stroke-dashoffset:([\d.]+)/)[1], undefined);
  assert.ok(Number(html.match(/stroke-dashoffset:([\d.]+)/)[1]) >= Number(beforeRing));
  const expectedRing = (2 * Math.PI * 15.5) * (1 - 32000 / 45000);
  assert.ok(Math.abs(Number(beforeRing) - expectedRing) < 0.5, `deadline-derived ring offset ${beforeRing}`);
  assert.deepEqual(effectsAfter, effectsBefore);
});

test('live result toggle preserves sanitized partial name and does not invoke certificate flow', () => {
  const fixture = loadLocaleStateApp();
  const result = { estimatedLevel: 'B1', correct: 7, answered: 9, totalQuestions: 10, skipped: 1 };
  fixture.context.window.__localeStateTest.enterResult(result);
  const effectsBefore = fixture.context.window.__localeStateTest.effects();
  const input = fixture.view().querySelector('#certName');
  input.value = '  <Sam>   Lee  ';
  fixture.view().querySelector('.elt-ui-locale-toggle').click();
  const html = fixture.view().innerHTML;
  assert.match(html, /elt-ui-locale-toggle/);
  assert.equal(fixture.context.window.__localeStateTest.state().activeView.data, result);
  assert.match(html, /value="&lt;Sam&gt; Lee"/);
  assert.equal(fixture.context.document.title, 'Тест уровня языка — Phraseman');
  assert.deepEqual(fixture.context.window.__localeStateTest.effects(), effectsBefore);
});

test('live locale rerender restores toggle focus only when it owned focus', () => {
  const focused = loadLocaleStateApp();
  focused.context.window.__localeStateTest.enterQuestion({ id: 'focus', scenarioRu: 'ru', instructionRu: 'ri', scenario: 'en', prompt: 'ep', stimulus: 'de', options: ['a'], correctIndex: 0 });
  const toggle = focused.view().querySelector('.elt-ui-locale-toggle');
  toggle.focus();
  toggle.click();
  assert.ok(focused.context.document.activeElement.matches('.elt-ui-locale-toggle'));
  assert.notEqual(focused.context.document.activeElement, toggle);

  const unfocused = loadLocaleStateApp();
  unfocused.context.window.__localeStateTest.enterQuestion({ id: 'blur', scenarioRu: 'ru', instructionRu: 'ri', scenario: 'en', prompt: 'ep', stimulus: 'de', options: ['a'], correctIndex: 0 });
  const other = new FakeNode('<button id="other">other</button>'); other.ownerDocument = unfocused.context.document; other.focus();
  unfocused.view().querySelector('.elt-ui-locale-toggle').click();
  assert.equal(unfocused.context.document.activeElement, other);
});

test('keyboard number selection locks immediately against repeated keys, click, and deadline races', () => {
  assertKeyboardAnswerRaceIsLocked(loadKeyboardStateApp());
});

test('focused Enter and Space selection share the click lock before delayed answer processing', () => {
  const question = { id: 'focused-key', scenarioRu: 'ru', instructionRu: 'instruction', scenario: 'scenario', prompt: 'prompt', options: ['first', 'second'], correctIndex: 1, level: 'A1' };

  const enterFixture = loadKeyboardStateApp();
  enterFixture.context.window.__keyboardStateTest.enterQuestion(question);
  const enterOptions = enterFixture.view().querySelectorAll('.elt-option');
  enterOptions[1].focus();
  assert.equal(keydown(enterFixture, 'Enter'), true);
  assert.equal(keydown(enterFixture, ' '), true);
  assert.equal(enterFixture.context.window.__keyboardStateTest.state().selectedAnswerIndex, 1);
  assert.equal(enterFixture.pendingTimeouts(200).length, 1);
  enterFixture.flushTimeouts(200);
  assert.deepEqual(enterFixture.context.window.__keyboardStateTest.effects().answers, [{ questionId: 'focused-key', selectedIndex: 1, skipped: false }]);

  const clickFixture = loadKeyboardStateApp();
  clickFixture.context.window.__keyboardStateTest.enterQuestion(question);
  const clickOptions = clickFixture.view().querySelectorAll('.elt-option');
  clickOptions[0].click();
  clickOptions[1].focus();
  assert.equal(keydown(clickFixture, 'Enter'), true);
  assert.equal(clickFixture.context.window.__keyboardStateTest.state().selectedAnswerIndex, 0);
  assert.equal(clickFixture.pendingTimeouts(200).length, 1);
  clickFixture.flushTimeouts(200);
  assert.deepEqual(clickFixture.context.window.__keyboardStateTest.effects().answers, [{ questionId: 'focused-key', selectedIndex: 0, skipped: false }]);
});

test('focused Space locks its first answer before later keyboard or click input', () => {
  assertSpaceFirstAnswerIsLocked(loadKeyboardStateApp());
});

test('stale outgoing option focus cannot answer the next question during cross-fade', () => {
  assertStaleCrossfadeFocusIsIgnored(loadKeyboardStateApp());
});

test('keyboard race behavioral contract rejects removal of the immediate selection gate', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  const withoutGate = source.replace(
    '    if (answerLocked || question !== currentQuestion || currentIndex < 0) return false;',
    '    if (question !== currentQuestion || currentIndex < 0) return false;',
  );
  assert.notEqual(withoutGate, source, 'mutation must remove the shared immediate selection gate');
  assert.throws(() => assertKeyboardAnswerRaceIsLocked(loadKeyboardStateApp({ source: withoutGate })));
});

test('Space-first behavioral contract rejects removing Space key handling', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  const withoutSpace = source.replace("e.key === 'Enter' || e.key === ' '", "e.key === 'Enter'");
  assert.notEqual(withoutSpace, source, 'mutation must remove Space key handling');
  assert.throws(() => assertSpaceFirstAnswerIsLocked(loadKeyboardStateApp({ source: withoutSpace })));
});

test('cross-fade keyboard contract rejects skipping stale option default prevention', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  const withoutStalePrevention = source.replace(
    "if ((e.key === 'Enter' || e.key === ' ') && focused?.classList?.contains('elt-option'))",
    "if ((e.key === 'Enter' || e.key === ' ') && idx >= 0)",
  );
  assert.notEqual(withoutStalePrevention, source, 'mutation must skip stale option default prevention');
  assert.throws(() => assertStaleCrossfadeFocusIsIgnored(loadKeyboardStateApp({ source: withoutStalePrevention })));
});

test('cross-fade keyboard contract rejects stale answer controls in selectAnswer', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  const withoutOwnershipGuard = source.replace(
    '    if (answerLocked || question !== currentQuestion || currentIndex < 0) return false;',
    '    if (answerLocked) return false;',
  );
  assert.notEqual(withoutOwnershipGuard, source, 'mutation must remove stale answer control ownership guard');
  assert.throws(() => assertStaleCrossfadeFocusIsIgnored(loadKeyboardStateApp({ source: withoutOwnershipGuard })));
});

test('behavioral harness rejects timer reset, result header removal, and focus restoration mutations', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  const enterQuestion = (mutated) => {
    const fixture = loadLocaleStateApp({ source: mutated });
    fixture.context.window.__localeStateTest.enterQuestion({ id: 'm', scenarioRu: 'ru', instructionRu: 'ri', scenario: 'en', prompt: 'ep', stimulus: 'de', options: ['a'], correctIndex: 0 });
    const toggle = fixture.view().querySelector('.elt-ui-locale-toggle');
    toggle.focus(); toggle.click();
    return fixture;
  };
  assert.throws(() => assert.notEqual(enterQuestion(source.replace('Math.max(0, questionDeadline - Date.now())', 'QUESTION_SECONDS * 1000')).view().innerHTML.match(/id="qTimerNum">(\d+)/)[1], '45'));
  assert.throws(() => {
    const html = enterQuestion(source.replace('const timerOffset = (TIMER_CIRCUMFERENCE * (1 - timerLeftMs / (QUESTION_SECONDS * 1000))).toFixed(1);', "const timerOffset = '0.0';")).view().innerHTML;
    const offset = Number(html.match(/stroke-dashoffset:([\d.]+)/)[1]);
    const expected = (2 * Math.PI * 15.5) * (1 - 32000 / 45000);
    assert.ok(Math.abs(offset - expected) < 0.5);
  });
  assert.throws(() => {
    const fixture = enterQuestion(source.replace("if (restoreLocaleToggleFocus) node.querySelector('.elt-ui-locale-toggle')?.focus?.();", ''));
    assert.notEqual(fixture.context.document.activeElement, fixture.view().parentNode.children.at(-2).querySelector('.elt-ui-locale-toggle'));
  });
  assert.throws(() => {
    const fixture = loadLocaleStateApp({ source: source.replace('        ${brandHeader()}\n        <div class="elt-result-card">', '        <div class="elt-result-card">') });
    fixture.context.window.__localeStateTest.enterResult({ estimatedLevel: 'A1', correct: 1, answered: 1, totalQuestions: 1, skipped: 0 });
    assert.ok(fixture.view().querySelector('.elt-ui-locale-toggle'));
  });
});

test('active visible-literal denylist rejects injected service copy regressions', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  assertNoBannedVisibleLiterals(source);
  for (const literal of ['Exit', 'Start free', 'Начать бесплатно']) {
    assert.throws(() => assertNoBannedVisibleLiterals(`${source}\nconst visible = '${literal}';`), literal);
  }
});

test('rerender side-effect mutation packets are observable through the live harness', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  const packets = ["api('view', {})", "api('complete', {})", 'reportTestCompletion()', 'fetch(EnglishTestI18n.TESTS[attemptTestLanguage].bankUrl)', 'fetchPublicCompleted()', 'generateCertificate("x", {})', 'engine.computeResult()'];
  for (const packet of packets) {
    const mutated = source.replace('function rerenderForUiLocale() {', `function rerenderForUiLocale() { ${packet};`);
    assert.throws(() => {
      const fixture = loadLocaleStateApp({ source: mutated });
      fixture.context.window.__localeStateTest.enterQuestion({ id: 'side', scenarioRu: 'ru', instructionRu: 'ri', scenario: 'en', prompt: 'ep', stimulus: 'de', options: ['a'], correctIndex: 0 });
      const before = fixture.context.window.__localeStateTest.effects();
      fixture.view().querySelector('.elt-ui-locale-toggle').click();
      assert.deepEqual(fixture.context.window.__localeStateTest.effects(), before);
    }, packet);
  }
});

test('non-English assessed attempts keep English-learning CTA copy in the interface locale', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  assert.doesNotMatch(source, /attemptTestLanguage && attemptTestLanguage !== 'en' \? 'en' : uiLocale/);
  const i18n = loadI18n();
  assert.match(i18n.t('ru', 'resultCta.mid.text'), /английск/i);
  assert.match(i18n.t('en', 'resultCta.mid.text'), /English/i);
});
