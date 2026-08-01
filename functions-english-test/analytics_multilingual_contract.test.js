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

function loadFunction(name, context = {}, sourceText = source) {
  const declaration = `function ${name}`;
  const functionStart = sourceText.indexOf(declaration);
  assert.ok(functionStart >= 0, `${name} must be defined in index.js`);
  const asyncStart = sourceText.lastIndexOf('async ', functionStart);
  const start = asyncStart >= 0
    && sourceText.slice(asyncStart, functionStart) === 'async '
    ? asyncStart
    : functionStart;

  const bodyStart = sourceText.indexOf('{', functionStart);
  let depth = 0;
  for (let cursor = bodyStart; cursor < sourceText.length; cursor += 1) {
    if (sourceText[cursor] === '{') depth += 1;
    if (sourceText[cursor] === '}') depth -= 1;
    if (depth === 0) {
      return vm.runInNewContext(`(${sourceText.slice(start, cursor + 1)})`, context);
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

test('normalizer mutation checks reject unsupported language and locale values', () => {
  const testLanguageMutant = source.replace(
    "return ['en', 'de', 'fr', 'it', 'es'].includes(value) ? value : 'en';",
    "return value === 'xx' ? 'xx' : 'en';",
  );
  const uiLocaleMutant = source.replace(
    "return ['en', 'ru'].includes(value) ? value : 'en';",
    "return value === 'fr' ? 'fr' : 'en';",
  );
  assert.notEqual(testLanguageMutant, source, 'test-language mutation must apply');
  assert.notEqual(uiLocaleMutant, source, 'UI-locale mutation must apply');

  assert.throws(() => {
    const normalizeTestLanguage = loadFunction('normalizeTestLanguage', {}, testLanguageMutant);
    assert.equal(normalizeTestLanguage('xx'), 'en');
  });
  assert.throws(() => {
    const normalizeUiLocale = loadFunction('normalizeUiLocale', {}, uiLocaleMutant);
    assert.equal(normalizeUiLocale('fr'), 'en');
  });
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
    async runTransaction(callback) {
      return callback({
        get: (ref) => ref.get(),
        set: (_ref, value) => { storedAttempt = plain(value); },
      });
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

function loadClientApiHarness(sourceText = appSource) {
  const requests = [];
  const instrumented = sourceText.replace(
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
  assert.notEqual(instrumented, sourceText, 'client harness must replace only the init tail');

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

test('client mutation check detects certificate-name and raw-question leakage', async () => {
  const mutant = appSource.replace(
    /        uiLocale,\r?\n      \};/u,
    '        uiLocale,\n        lastCertName,\n        rawQuestionText: currentQuestion?.prompt,\n      };',
  );
  assert.notEqual(mutant, appSource, 'PII-leak mutation must apply');

  await assert.rejects(async () => {
    const harness = loadClientApiHarness(mutant);
    harness.api.setState({
      consent: true,
      selectedTestLanguage: 'fr',
      attemptTestLanguage: 'de',
      uiLocale: 'ru',
      lastCertName: 'Ada Lovelace',
      currentQuestion: { prompt: 'Raw selected question text' },
    });
    await harness.api.send('certificate', {});
    const body = JSON.parse(harness.requests[0].init.body);
    assert.equal(Object.hasOwn(body, 'lastCertName'), false);
    assert.equal(Object.hasOwn(body, 'rawQuestionText'), false);
  });
});

function createFirestoreHarness() {
  const documents = new Map();
  const writes = [];
  const transactionWrites = [];

  const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const snapshot = (path) => ({
    exists: documents.has(path),
    data: () => clone(documents.get(path)),
  });
  const assignPath = (target, dottedPath, value) => {
    const parts = dottedPath.split('.');
    let cursor = target;
    for (const part of parts.slice(0, -1)) {
      if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
      cursor = cursor[part];
    }
    const key = parts.at(-1);
    cursor[key] = value?.__increment === true
      ? (Number(cursor[key]) || 0) + value.amount
      : clone(value);
  };
  const applySet = (path, value, options) => {
    const next = options?.merge ? { ...(documents.get(path) || {}) } : {};
    for (const [key, fieldValue] of Object.entries(value)) assignPath(next, key, fieldValue);
    documents.set(path, next);
  };
  const applyUpdate = (path, value) => {
    assert.equal(documents.has(path), true, `cannot update missing ${path}`);
    const next = { ...documents.get(path) };
    for (const [key, fieldValue] of Object.entries(value)) assignPath(next, key, fieldValue);
    documents.set(path, next);
  };
  const doc = (collectionName, id) => {
    const path = `${collectionName}/${id}`;
    return {
      path,
      async get() { return snapshot(path); },
      async set(value, options) {
        writes.push({ kind: 'set', path, value: clone(value) });
        applySet(path, value, options);
      },
      async update(value) {
        writes.push({ kind: 'update', path, value: clone(value) });
        applyUpdate(path, value);
      },
    };
  };
  const db = {
    collection(name) {
      return { doc: (id) => doc(name, id) };
    },
    async runTransaction(callback) {
      const pending = [];
      const transaction = {
        get: (ref) => Promise.resolve(snapshot(ref.path)),
        set: (ref, value, options) => pending.push({ kind: 'set', ref, value, options }),
        update: (ref, value) => pending.push({ kind: 'update', ref, value }),
      };
      const result = await callback(transaction);
      for (const operation of pending) {
        transactionWrites.push({
          kind: operation.kind,
          path: operation.ref.path,
          value: clone(operation.value),
        });
        if (operation.kind === 'set') {
          applySet(operation.ref.path, operation.value, operation.options);
        } else {
          applyUpdate(operation.ref.path, operation.value);
        }
      }
      return result;
    },
  };
  return { db, documents, transactionWrites, writes };
}

function loadApiHandlerHarness() {
  const firestore = createFirestoreHarness();
  class CompletionRateLimitError extends Error {}
  const exportsObject = {};
  const context = vm.createContext({
    Buffer,
    Date,
    Promise,
    console: { error() {}, log() {}, warn() {} },
    exports: exportsObject,
    require(moduleName) {
      if (moduleName === 'crypto') return require('node:crypto');
      if (moduleName === 'firebase-functions/v2/https') {
        return {
          onRequest: (_options, handler) => handler,
          onCall: (_options, handler) => handler,
        };
      }
      if (moduleName === 'firebase-functions/v2/scheduler') {
        return { onSchedule: (_options, handler) => handler };
      }
      if (moduleName === 'firebase-functions/params') {
        return { defineSecret: () => ({ value: () => 'test-secret' }) };
      }
      if (moduleName === 'firebase-admin/app') return { initializeApp() {} };
      if (moduleName === 'firebase-admin/firestore') {
        return {
          FieldValue: { increment: (amount) => ({ __increment: true, amount }) },
          getFirestore: () => firestore.db,
        };
      }
      if (moduleName === './completion_counter') {
        return {
          CompletionRateLimitError,
          countCompletion: async () => ({ completed: 1, duplicate: false }),
          isValidCompletionPayload: () => true,
          readCompletedCount: async () => 0,
        };
      }
      if (moduleName === './request_security') {
        return {
          getTrustedExternalClientIp: () => '203.0.113.10',
          requestBodyByteLength: () => 0,
        };
      }
      throw new Error(`Unexpected module: ${moduleName}`);
    },
  });
  vm.runInContext(source, context, { filename: path.join(__dirname, 'index.js') });

  const attemptPath = (token) => {
    const tokenHash = require('node:crypto')
      .createHash('sha256')
      .update(token + 'test-secret')
      .digest('hex');
    return `english_test_attempts/${tokenHash}`;
  };
  const request = async (action, token, fields = {}) => {
    const req = {
      method: 'POST',
      headers: { 'user-agent': 'contract-test-browser' },
      body: {
        action,
        attemptToken: token,
        clientHash: `client-${token}`,
        ...fields,
      },
    };
    const response = { statusCode: 200, body: null, headers: {} };
    const res = {
      set(name, value) { response.headers[name] = value; return this; },
      status(code) { response.statusCode = code; return this; },
      json(value) { response.body = plain(value); return this; },
      send(value) { response.body = value; return this; },
    };
    await exportsObject.englishTestApi(req, res);
    return response;
  };
  const readAttempt = (token) => plain(firestore.documents.get(attemptPath(token)));
  const replaceAttempt = (token, next) => firestore.documents.set(attemptPath(token), plain(next));
  return { ...firestore, attemptPath, readAttempt, replaceAttempt, request };
}

test('landing or view creation reconciles the first legitimate start bank version exactly once', async () => {
  const harness = loadApiHandlerHarness();
  for (const [initialAction, initialFields] of [
    ['landing', { testLanguage: 'de', uiLocale: 'ru' }],
    ['view', { questionId: 'de-a1-001', position: 1, testLanguage: 'de', uiLocale: 'ru' }],
  ]) {
    const token = `race-${initialAction}`;
    assert.equal((await harness.request(initialAction, token, initialFields)).statusCode, 200);
    assert.equal((await harness.request('start', token, {
      bankVersion: '2026-08-01.7',
      testLanguage: 'de',
      uiLocale: 'ru',
    })).statusCode, 200);
    assert.equal(harness.readAttempt(token).bankVersion, '2026-08-01.7');

    const attemptWrites = harness.transactionWrites.filter(({ path: writePath }) => (
      writePath === harness.attemptPath(token)
    ));
    assert.equal(attemptWrites.some(({ value }) => value.bankVersion === '2026-08-01.7'), true);

    assert.equal((await harness.request('start', token, {
      bankVersion: '2026-08-01.99',
      testLanguage: 'de',
      uiLocale: 'ru',
    })).statusCode, 400);
    assert.equal(harness.readAttempt(token).bankVersion, '2026-08-01.7');
  }
});

test('handler binds every event and question ID to the frozen attempt language', async () => {
  const harness = loadApiHandlerHarness();
  const token = 'frozen-de';
  assert.equal((await harness.request('start', token, {
    bankVersion: '2026-08-01.7', testLanguage: 'de', uiLocale: 'ru',
  })).statusCode, 200);
  assert.equal((await harness.request('view', token, {
    questionId: 'de-a1-001', position: 1, testLanguage: 'de', uiLocale: 'ru',
  })).statusCode, 200);
  assert.deepEqual(harness.readAttempt(token).questionSequence, ['de-a1-001']);

  for (const fields of [
    { questionId: 'fr-a1-002', position: 2, testLanguage: 'de', uiLocale: 'ru' },
    { questionId: 'en-a1-002', position: 2, testLanguage: 'de', uiLocale: 'ru' },
  ]) {
    const before = harness.readAttempt(token);
    assert.equal((await harness.request('view', token, fields)).statusCode, 400);
    assert.deepEqual(harness.readAttempt(token), before);
  }

  const beforeMismatchedEvent = harness.readAttempt(token);
  assert.equal((await harness.request('certificate', token, {
    testLanguage: 'fr', uiLocale: 'ru', name: 'Must not persist',
  })).statusCode, 400);
  assert.deepEqual(harness.readAttempt(token), beforeMismatchedEvent);
});

test('legacy attempts without a stored language freeze to English', async () => {
  const harness = loadApiHandlerHarness();
  const token = 'legacy-language';
  assert.equal((await harness.request('landing', token, {})).statusCode, 200);
  const legacyAttempt = harness.readAttempt(token);
  delete legacyAttempt.testLanguage;
  harness.replaceAttempt(token, legacyAttempt);

  assert.equal((await harness.request('view', token, {
    questionId: 'en-a1-001', position: 1,
  })).statusCode, 200);
  const beforeGerman = harness.readAttempt(token);
  assert.equal((await harness.request('view', token, {
    questionId: 'de-a1-002', position: 2, testLanguage: 'de', uiLocale: 'en',
  })).statusCode, 400);
  assert.deepEqual(harness.readAttempt(token), beforeGerman);
});

test('complete persists only the six-field result while dimensions remain at attempt level', async () => {
  const harness = loadApiHandlerHarness();
  const token = 'result-shape';
  assert.equal((await harness.request('start', token, {
    bankVersion: '2026-08-01.7', testLanguage: 'de', uiLocale: 'ru',
  })).statusCode, 200);
  assert.equal((await harness.request('complete', token, {
    testLanguage: 'de',
    uiLocale: 'en',
    result: validResult(),
  })).statusCode, 200);

  const attempt = harness.readAttempt(token);
  assert.deepEqual(attempt.result, validResult());
  assert.equal(attempt.testLanguage, 'de');
  assert.equal(attempt.uiLocale, 'ru');
  assert.equal(Object.hasOwn(attempt.result, 'testLanguage'), false);
  assert.equal(Object.hasOwn(attempt.result, 'uiLocale'), false);
});
