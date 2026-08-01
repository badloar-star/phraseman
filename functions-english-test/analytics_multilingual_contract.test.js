const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const appPath = path.join(__dirname, '..', 'knowly-www', 'english-level-test', 'app.js');
const appSource = fs.readFileSync(appPath, 'utf8');
const DEFAULT_BANK_VERSION = '2026-07-22.4';

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadFunction(name, context = {}) {
  const declaration = `function ${name}`;
  const functionStart = source.indexOf(declaration);
  assert.ok(functionStart >= 0, `${name} must be defined in index.js`);
  const asyncStart = source.lastIndexOf('async ', functionStart);
  const start = asyncStart >= 0
    && source.slice(asyncStart, functionStart) === 'async '
    ? asyncStart
    : functionStart;

  const bodyStart = source.indexOf('{', functionStart);
  let depth = 0;
  for (let cursor = bodyStart; cursor < source.length; cursor += 1) {
    if (source[cursor] === '{') depth += 1;
    if (source[cursor] === '}') depth -= 1;
    if (depth === 0) {
      return vm.runInNewContext(`(${source.slice(start, cursor + 1)})`, context);
    }
  }

  throw new Error(`Could not parse ${name}`);
}

function loadOptionalFunction(name, fallback, context = {}) {
  return source.includes(`function ${name}`) ? loadFunction(name, context) : fallback;
}

function referenceTestLanguage(value) {
  return ['en', 'de', 'fr', 'it', 'es'].includes(value) ? value : 'en';
}

function referenceUiLocale(value) {
  return ['en', 'ru'].includes(value) ? value : 'en';
}

function loadServerContract() {
  const normalizeTestLanguage = loadOptionalFunction(
    'normalizeTestLanguage',
    referenceTestLanguage,
  );
  const normalizeUiLocale = loadOptionalFunction('normalizeUiLocale', referenceUiLocale);
  const normalizeBankVersion = loadFunction('normalizeBankVersion', {
    BANK_VERSION: DEFAULT_BANK_VERSION,
  });
  const normalizeQuestionIdentity = loadFunction('normalizeQuestionIdentity');
  const normalizeProgressResponse = loadFunction('normalizeProgressResponse', {
    normalizeQuestionIdentity,
  });
  const normalizeCompletedResult = loadFunction('normalizeCompletedResult');
  const normalizeAnalyticsDimensions = (body) => ({
    testLanguage: normalizeTestLanguage(body?.testLanguage),
    uiLocale: normalizeUiLocale(body?.uiLocale),
  });
  const normalizeAnalyticsAction = loadFunction('normalizeAnalyticsAction', {
    normalizeAnalyticsAction: undefined,
    normalizeAnalyticsDimensions,
    normalizeBankVersion,
    normalizeCompletedResult,
    normalizeProgressResponse,
    normalizeQuestionIdentity,
    normalizeTestLanguage,
    normalizeUiLocale,
  });
  return {
    normalizeAnalyticsAction,
    normalizeBankVersion,
    normalizeCompletedResult,
    normalizeProgressResponse,
    normalizeQuestionIdentity,
    normalizeTestLanguage,
    normalizeUiLocale,
  };
}

function validProgress(questionId = 'en-a1-001') {
  return {
    questionId,
    position: 1,
    questionLevel: 'A1',
    correct: true,
    targetBefore: 'A1',
    targetAfter: 'A1',
    selectedIndex: 0,
    skipped: false,
    responseTimeMs: 1000,
  };
}

function validResult() {
  return {
    estimatedLevel: 'B1',
    correct: 12,
    answered: 16,
    totalQuestions: 20,
    assessmentScope: 'text-only',
    stopReason: 'minimum_evidence',
  };
}

test('server language and locale normalizers allowlist supported dimensions with English fallback', () => {
  const normalizeTestLanguage = loadFunction('normalizeTestLanguage');
  const normalizeUiLocale = loadFunction('normalizeUiLocale');

  assert.equal(normalizeTestLanguage('de'), 'de');
  assert.equal(normalizeTestLanguage('xx'), 'en');
  assert.equal(normalizeUiLocale('ru'), 'ru');
  assert.equal(normalizeUiLocale('fr'), 'en');
});

test('legacy English start, view, progress, and complete bodies remain valid with default dimensions', () => {
  const { normalizeAnalyticsAction } = loadServerContract();
  const actions = [
    normalizeAnalyticsAction('start', { bankVersion: '2026-08-01.7' }),
    normalizeAnalyticsAction('view', { questionId: 'en-c2-040', position: 20 }),
    normalizeAnalyticsAction('progress', validProgress()),
    normalizeAnalyticsAction('complete', { result: validResult() }),
  ];

  for (const normalized of actions) {
    assert.notEqual(normalized, null);
    assert.equal(normalized.payload.testLanguage, 'en');
    assert.equal(normalized.payload.uiLocale, 'en');
  }
  assert.equal(actions[0].payload.bankVersion, '2026-08-01.7');
});

test('normalized multilingual events carry only allowlisted analytics dimensions', () => {
  const { normalizeAnalyticsAction } = loadServerContract();
  const cases = [
    ['landing', { testLanguage: 'de', uiLocale: 'ru' }],
    ['start', { bankVersion: '2026-08-01.7', testLanguage: 'de', uiLocale: 'ru' }],
    ['view', { questionId: 'fr-c2-040', position: 20, testLanguage: 'fr', uiLocale: 'ru' }],
    ['progress', { ...validProgress('it-a1-001'), testLanguage: 'it', uiLocale: 'en' }],
    ['complete', { result: validResult(), testLanguage: 'es', uiLocale: 'ru' }],
    ['certificate', { testLanguage: 'de', uiLocale: 'ru', name: 'Ada Lovelace' }],
  ];

  const normalized = cases.map(([action, body]) => normalizeAnalyticsAction(action, body));
  for (const event of normalized) assert.notEqual(event, null);
  assert.deepEqual(normalized.map((event) => plain({
    action: event.action,
    testLanguage: event.payload.testLanguage,
    uiLocale: event.payload.uiLocale,
  })), [
    { action: 'landing', testLanguage: 'de', uiLocale: 'ru' },
    { action: 'start', testLanguage: 'de', uiLocale: 'ru' },
    { action: 'view', testLanguage: 'fr', uiLocale: 'ru' },
    { action: 'progress', testLanguage: 'it', uiLocale: 'en' },
    { action: 'complete', testLanguage: 'es', uiLocale: 'ru' },
    { action: 'certificate', testLanguage: 'de', uiLocale: 'ru' },
  ]);
  assert.equal(Object.hasOwn(normalized.at(-1).payload, 'name'), false);

  const unsupported = normalizeAnalyticsAction('start', {
    bankVersion: '2026-08-01.7',
    testLanguage: 'xx',
    uiLocale: 'fr',
  });
  assert.deepEqual(plain(unsupported.payload), {
    bankVersion: '2026-08-01.7',
    testLanguage: 'en',
    uiLocale: 'en',
  });
});

test('new attempts persist normalized dimensions and submitted normalized bank version without PII', async () => {
  const contract = loadServerContract();
  let storedAttempt = null;
  const docRef = {
    async get() { return { exists: false }; },
    async set(value) { storedAttempt = plain(value); },
  };
  const db = {
    collection(name) {
      assert.equal(name, 'english_test_attempts');
      return { doc() { return docRef; } };
    },
  };
  const getOrCreateAttempt = loadFunction('getOrCreateAttempt', {
    ATTEMPT_TTL_DAYS: 180,
    browserBucket: () => 'test-browser',
    db,
    deviceBucket: () => 'desktop',
    getAttemptNumber: async () => 1,
    getExpiresAt: (days) => ({ days }),
    hmac: (_key, value) => `hmac:${value}`,
    normalizeBankVersion: contract.normalizeBankVersion,
    normalizeTestLanguage: contract.normalizeTestLanguage,
    normalizeUiLocale: contract.normalizeUiLocale,
    osBucket: () => 'test-os',
    sanitizeString: (value, maxLength) => typeof value === 'string' ? value.slice(0, maxLength) : '',
    sha256: (value) => `sha256:${value}`,
  });

  await getOrCreateAttempt('token', 'client', 'secret', {
    bankVersion: '2026-08-01.7',
    testLanguage: 'de',
    uiLocale: 'ru',
    source: 'landing',
    userAgent: 'test',
    name: 'Ada Lovelace',
    prompt: 'Raw question text must never be stored',
  });

  assert.equal(storedAttempt.bankVersion, '2026-08-01.7');
  assert.equal(storedAttempt.testLanguage, 'de');
  assert.equal(storedAttempt.uiLocale, 'ru');
  assert.equal(Object.hasOwn(storedAttempt, 'name'), false);
  assert.equal(Object.hasOwn(storedAttempt, 'prompt'), false);
  assert.equal(JSON.stringify(storedAttempt).includes('Ada Lovelace'), false);
  assert.equal(JSON.stringify(storedAttempt).includes('Raw question text'), false);
});

function loadClientApiHarness() {
  const requests = [];
  const instrumented = appSource.replace(
    /  \/\/ ---------- Init ----------[\s\S]*$/,
    `  window.__analyticsContract = {
      setState(value) {
        consent = value.consent;
        attemptToken = 'attempt-token';
        clientHash = 'a'.repeat(48);
        selectedTestLanguage = value.selectedTestLanguage;
        attemptTestLanguage = value.attemptTestLanguage;
        uiLocale = value.uiLocale;
        lastCertName = value.lastCertName;
        currentQuestion = value.currentQuestion;
      },
      send: (action, payload) => api(action, payload),
    };
  })();`,
  );
  assert.notEqual(instrumented, appSource, 'client harness must replace only the init tail');

  const window = { matchMedia: () => ({ matches: true }) };
  const context = vm.createContext({
    URL,
    URLSearchParams,
    Uint8Array,
    console,
    crypto: { getRandomValues: (values) => values.fill(1) },
    document: {
      addEventListener() {},
      removeEventListener() {},
      getElementById: () => ({}),
      querySelector: () => null,
      title: '',
    },
    EnglishTestI18n: {
      readStoredLocale: () => null,
      resolveUiLocale: () => 'en',
      resolveTestLanguage: () => 'en',
    },
    fetch: async (url, init) => {
      requests.push({ url, init });
      return { ok: true, json: async () => ({ ok: true }) };
    },
    localStorage: { getItem: () => null, setItem() {} },
    location: { search: '' },
    navigator: { language: 'en', userAgent: 'test' },
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    window: Object.assign(window, { addEventListener() {}, removeEventListener() {} }),
  });
  vm.runInContext(instrumented, context, { filename: appPath });
  return { api: window.__analyticsContract, requests };
}

test('client analytics appends selected or frozen test language and UI locale without local PII', async () => {
  const harness = loadClientApiHarness();
  harness.api.setState({
    consent: true,
    selectedTestLanguage: 'fr',
    attemptTestLanguage: null,
    uiLocale: 'ru',
    lastCertName: 'Ada Lovelace',
    currentQuestion: { prompt: 'Raw selected question text' },
  });
  await harness.api.send('start', { bankVersion: '2026-08-01.7' });

  harness.api.setState({
    consent: true,
    selectedTestLanguage: 'es',
    attemptTestLanguage: 'de',
    uiLocale: 'en',
    lastCertName: 'Grace Hopper',
    currentQuestion: { prompt: 'Another raw question' },
  });
  await harness.api.send('certificate', {});

  const bodies = harness.requests.map(({ init }) => JSON.parse(init.body));
  assert.deepEqual(plain({
    action: bodies[0].action,
    bankVersion: bodies[0].bankVersion,
    testLanguage: bodies[0].testLanguage,
    uiLocale: bodies[0].uiLocale,
  }), {
    action: 'start',
    bankVersion: '2026-08-01.7',
    testLanguage: 'fr',
    uiLocale: 'ru',
  });
  assert.deepEqual(plain({
    action: bodies[1].action,
    testLanguage: bodies[1].testLanguage,
    uiLocale: bodies[1].uiLocale,
  }), {
    action: 'certificate',
    testLanguage: 'de',
    uiLocale: 'en',
  });
  for (const body of bodies) {
    assert.equal(Object.hasOwn(body, 'lastCertName'), false);
    assert.equal(Object.hasOwn(body, 'name'), false);
    assert.equal(Object.hasOwn(body, 'prompt'), false);
    assert.equal(JSON.stringify(body).includes('Ada Lovelace'), false);
    assert.equal(JSON.stringify(body).includes('Raw selected question text'), false);
  }
});
