const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const handlerSource = source.slice(
  source.indexOf('exports.englishTestApi = onRequest'),
  source.indexOf('async function updateDailyAggregate'),
);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadFunction(name, context = {}) {
  const declaration = `function ${name}`;
  const start = source.indexOf(declaration);
  assert.ok(start >= 0, `${name} must be defined in index.js`);

  const bodyStart = source.indexOf('{', start);
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

function loadOptionalFunction(name, fallback) {
  return source.includes(`function ${name}`) ? loadFunction(name) : fallback;
}

function loadProgressNormalizer() {
  const normalizeQuestionIdentity = loadFunction('normalizeQuestionIdentity');
  return loadFunction('normalizeProgressResponse', { normalizeQuestionIdentity });
}

function loadActionNormalizer() {
  const normalizeQuestionIdentity = loadFunction('normalizeQuestionIdentity');
  const normalizeProgressResponse = loadFunction('normalizeProgressResponse', {
    normalizeQuestionIdentity,
  });
  const normalizeCompletedResult = loadFunction('normalizeCompletedResult');
  const normalizeBankVersion = loadFunction('normalizeBankVersion', {
    BANK_VERSION: '2026-07-22.4',
  });
  const normalizeTestLanguage = loadOptionalFunction(
    'normalizeTestLanguage',
    (value) => ['en', 'de', 'fr', 'it', 'es'].includes(value) ? value : 'en',
  );
  const normalizeUiLocale = loadOptionalFunction(
    'normalizeUiLocale',
    (value) => ['en', 'ru'].includes(value) ? value : 'en',
  );
  const normalizeAnalyticsDimensions = (body) => ({
    testLanguage: normalizeTestLanguage(body?.testLanguage),
    uiLocale: normalizeUiLocale(body?.uiLocale),
  });
  return loadFunction('normalizeAnalyticsAction', {
    normalizeAnalyticsDimensions,
    normalizeBankVersion,
    normalizeCompletedResult,
    normalizeProgressResponse,
    normalizeQuestionIdentity,
    normalizeTestLanguage,
    normalizeUiLocale,
  });
}

function validProgress(overrides = {}) {
  return {
    questionId: 'en-a1-001',
    position: 1,
    questionLevel: 'A1',
    correct: false,
    targetBefore: 'A1',
    targetAfter: 'A1',
    selectedIndex: 0,
    skipped: false,
    responseTimeMs: 1000,
    ...overrides,
  };
}

test('complete analytics persists only the supported text assessment result', () => {
  const normalizeCompletedResult = loadFunction('normalizeCompletedResult');
  const input = {
    estimatedLevel: 'B2',
    correct: 14,
    answered: 18,
    totalQuestions: 20,
    assessmentScope: 'text-only',
    stopReason: 'max_questions',
    index: 87,
    confidence: 91,
    name: 'Not analytics',
    rawIp: '203.0.113.7',
    content: 'raw answer content',
  };

  assert.deepEqual(
    { ...normalizeCompletedResult(input) },
    {
      estimatedLevel: 'B2',
      correct: 14,
      answered: 18,
      totalQuestions: 20,
      assessmentScope: 'text-only',
      stopReason: 'max_questions',
    },
  );
});

test('complete analytics rejects unsupported or inconsistent result values', () => {
  const normalizeCompletedResult = loadFunction('normalizeCompletedResult');
  const valid = {
    estimatedLevel: 'A2',
    correct: 10,
    answered: 15,
    totalQuestions: 20,
    assessmentScope: 'text-only',
    stopReason: 'minimum_evidence',
  };
  const invalid = [
    { ...valid, estimatedLevel: 'A0' },
    { ...valid, estimatedLevel: 'b2' },
    { ...valid, correct: -1 },
    { ...valid, correct: 10.5 },
    { ...valid, answered: 21 },
    { ...valid, totalQuestions: 21 },
    { ...valid, correct: 16, answered: 15 },
    { ...valid, answered: 16, totalQuestions: 15 },
    { ...valid, correct: '10' },
    { ...valid, assessmentScope: 'full' },
    { ...valid, stopReason: 'unknown' },
    null,
    [],
  ];

  for (const result of invalid) {
    assert.equal(normalizeCompletedResult(result), null);
  }
});

test('legacy index and confidence payload remains non-throwing but is not persisted', () => {
  const normalizeCompletedResult = loadFunction('normalizeCompletedResult');

  assert.doesNotThrow(() => normalizeCompletedResult({ index: 75, confidence: 88 }));
  assert.equal(normalizeCompletedResult({ index: 75, confidence: 88 }), null);
});

test('complete action writes a result only after contract normalization', () => {
  const completeCase = handlerSource.slice(
    handlerSource.indexOf("case 'complete':"),
    handlerSource.indexOf("case 'abandon':"),
  );

  assert.match(completeCase, /update\.result\s*=\s*normalizedAction\.payload/);
  assert.doesNotMatch(completeCase, /body\.result\.(?:index|confidence)/);
});

test('attempt bank version is strictly normalized and bounded before persistence', () => {
  const normalizeBankVersion = loadFunction('normalizeBankVersion', {
    BANK_VERSION: '2026-07-22.4',
  });

  assert.equal(normalizeBankVersion('2026-07-22.123'), '2026-07-22.123');
  const invalid = [
    '',
    '2026-7-22.2',
    '2026-07-22',
    '2026-07-22.2<script>',
    `2026-07-22.${'1'.repeat(22)}`,
    { toString: () => '2026-07-22.2' },
    null,
  ];
  for (const value of invalid) {
    assert.equal(normalizeBankVersion(value), '2026-07-22.4');
  }

  const attemptCreation = source.slice(
    source.indexOf('async function getOrCreateAttempt'),
    source.indexOf('async function getAttemptNumber'),
  );
  assert.match(attemptCreation, /bankVersion:\s*normalizeBankVersion\(payload\.bankVersion\)/);
  assert.doesNotMatch(attemptCreation, /bankVersion:\s*payload\.bankVersion/);
});

test('shared question identity validator accepts only supported language IDs and bounded positions', () => {
  const normalizeQuestionIdentity = loadFunction('normalizeQuestionIdentity');
  for (const testLanguage of ['en', 'de', 'fr', 'it', 'es']) {
    assert.deepEqual(
      plain(normalizeQuestionIdentity({
        questionId: `${testLanguage}-c2-040`,
        position: 20,
        prompt: 'raw text',
        profile: { name: 'PII' },
      })),
      { questionId: `${testLanguage}-c2-040`, position: 20 },
    );
  }

  const invalid = [
    {},
    { questionId: 'en-a1-001', position: 0 },
    { questionId: 'en-a1-001', position: 21 },
    { questionId: 'en-a1-001', position: 1.5 },
    { questionId: 'raw-question-id', position: 1 },
    { questionId: 'xx-c2-040', position: 20 },
    { questionId: { id: 'en-a1-001' }, position: 1 },
    null,
    [],
  ];
  for (const value of invalid) assert.equal(normalizeQuestionIdentity(value), null);
});

test('view updates are allowlisted, idempotent, and bounded to twenty questions', () => {
  const normalizeQuestionIdentity = loadFunction('normalizeQuestionIdentity');
  const buildViewUpdate = loadFunction('buildViewUpdate', { normalizeQuestionIdentity });
  const first = buildViewUpdate(
    { views: 0, lastPosition: 0, questionSequence: [], profile: { name: 'PII' } },
    { questionId: 'en-a1-001', position: 1, prompt: 'raw text', rawIp: '203.0.113.7' },
  );
  assert.deepEqual(plain(first), {
    views: 1,
    lastPosition: 1,
    questionSequence: ['en-a1-001'],
  });

  assert.deepEqual(
    plain(buildViewUpdate(first, { questionId: 'en-a1-001', position: 1 })),
    plain(first),
  );
  assert.deepEqual(
    plain(buildViewUpdate(first, { questionId: 'en-a1-002', position: 1 })),
    { views: 1, lastPosition: 1, questionSequence: ['en-a1-002'] },
  );

  const twentyIds = Array.from(
    { length: 20 },
    (_, index) => `en-a1-${String(index + 1).padStart(3, '0')}`,
  );
  const bounded = buildViewUpdate(
    { views: 999, lastPosition: 999, questionSequence: [...twentyIds, { name: 'PII' }, 'raw'] },
    { questionId: twentyIds[19], position: 20 },
  );
  assert.equal(bounded.views, 20);
  assert.equal(bounded.lastPosition, 20);
  assert.deepEqual(plain(bounded.questionSequence), twentyIds);
  assert.equal(buildViewUpdate(first, { questionId: 'raw', position: 2 }), null);
});

test('progress analytics persists only validated adaptive-engine evidence', () => {
  const normalizeProgressResponse = loadProgressNormalizer();
  const input = {
    questionId: 'en-b1-007',
    position: 7,
    questionLevel: 'B1',
    correct: true,
    targetBefore: 'A2',
    targetAfter: 'B1',
    selectedIndex: 2,
    skipped: false,
    responseTimeMs: 1126,
    prompt: 'raw question text',
    answer: 'raw answer text',
    name: 'Not analytics',
  };

  assert.deepEqual(
    { ...normalizeProgressResponse(input) },
    {
      questionId: 'en-b1-007',
      position: 7,
      questionLevel: 'B1',
      correct: true,
      targetBefore: 'A2',
      targetAfter: 'B1',
      selectedIndex: 2,
      skipped: false,
      responseTimeMs: 1250,
    },
  );
});

test('progress analytics validates identity, position, levels, booleans, answer index, and finite time', () => {
  const normalizeProgressResponse = loadProgressNormalizer();
  const answered = validProgress();
  const skipped = { ...answered, selectedIndex: -1, skipped: true };

  assert.deepEqual(
    { ...normalizeProgressResponse({ ...answered, responseTimeMs: -100 }) },
    { ...answered, responseTimeMs: 0 },
  );
  assert.deepEqual(
    { ...normalizeProgressResponse({ ...answered, responseTimeMs: 999999 }) },
    { ...answered, responseTimeMs: 120000 },
  );
  assert.deepEqual({ ...normalizeProgressResponse(skipped) }, skipped);

  const invalid = [
    { ...answered, questionId: undefined },
    { ...answered, questionId: 'en-a1-01' },
    { ...answered, questionId: 'en-a1-0001' },
    { ...answered, questionId: 'en-A1-001' },
    { ...answered, questionId: 'raw-question-id' },
    { ...answered, position: undefined },
    { ...answered, position: 0 },
    { ...answered, position: 21 },
    { ...answered, position: 1.5 },
    { ...answered, position: '1' },
    { ...answered, questionLevel: 'Pre-A1' },
    { ...answered, targetBefore: 'A0' },
    { ...answered, targetAfter: 'b2' },
    { ...answered, correct: 1 },
    { ...answered, skipped: 'false' },
    { ...answered, selectedIndex: 1.5 },
    { ...answered, selectedIndex: -1 },
    { ...skipped, selectedIndex: 0 },
    { ...skipped, correct: true },
    { ...answered, responseTimeMs: '1000' },
    { ...answered, responseTimeMs: Number.NaN },
    { ...answered, responseTimeMs: Number.POSITIVE_INFINITY },
    null,
    [],
  ];

  for (const response of invalid) {
    assert.equal(normalizeProgressResponse(response), null);
  }
});

test('progress responses are allowlisted, idempotent, and bounded to twenty entries', () => {
  const normalizeProgressResponse = loadProgressNormalizer();
  const mergeProgressResponses = loadFunction('mergeProgressResponses', {
    normalizeProgressResponse,
  });
  const first = mergeProgressResponses([], validProgress({
    prompt: 'raw question text',
    answer: 'raw answer text',
    profile: { name: 'PII' },
  }));
  assert.deepEqual(plain(first), [validProgress()]);

  const replacement = validProgress({ correct: true, responseTimeMs: 2000, rawIp: '203.0.113.7' });
  const replaced = mergeProgressResponses(first, replacement);
  assert.equal(replaced.length, 1);
  assert.deepEqual(plain(replaced[0]), validProgress({ correct: true, responseTimeMs: 2000 }));

  const movedSameQuestion = mergeProgressResponses(
    replaced,
    validProgress({ position: 2, responseTimeMs: 3000 }),
  );
  assert.equal(movedSameQuestion.length, 1);
  assert.equal(movedSameQuestion[0].position, 2);

  const twenty = Array.from(
    { length: 20 },
    (_, index) => validProgress({
      questionId: `en-a1-${String(index + 1).padStart(3, '0')}`,
      position: index + 1,
    }),
  );
  const bounded = mergeProgressResponses(
    [...twenty, { prompt: 'raw text', profile: { name: 'PII' } }],
    validProgress({ questionId: 'en-a1-020', position: 20, responseTimeMs: 4000 }),
  );
  assert.equal(bounded.length, 20);
  assert.equal(bounded[19].responseTimeMs, 4000);
  assert.equal(JSON.stringify(bounded).includes('PII'), false);
  assert.equal(mergeProgressResponses(first, { questionId: 'raw', position: 2 }), null);
});

test('view action uses only the bounded normalized update', () => {
  const viewCase = handlerSource.slice(
    handlerSource.indexOf("case 'view':"),
    handlerSource.indexOf("case 'progress':"),
  );

  assert.match(viewCase, /buildViewUpdate\(attemptData, normalizedAction\.payload\)/);
  assert.doesNotMatch(viewCase, /body\.(?:questionId|position)|\.push\(/);
});

test('progress action stores only the normalized response projection', () => {
  const progressCase = handlerSource.slice(
    handlerSource.indexOf("case 'progress':"),
    handlerSource.indexOf("case 'complete':"),
  );

  assert.match(progressCase, /progressResponse\s*=\s*normalizedAction\.payload/);
  assert.match(progressCase, /mergeProgressResponses\(/);
  assert.doesNotMatch(progressCase, /body\.(?:questionId|position)|responses\.push|timestamp|responseTime:/);
});

test('analytics action validation rejects unknown and malformed payloads before persistence', () => {
  const normalizeAnalyticsAction = loadActionNormalizer();
  assert.equal(normalizeAnalyticsAction('unknown', {}), null);
  assert.equal(normalizeAnalyticsAction('view', { questionId: 'raw', position: 1 }), null);
  assert.equal(normalizeAnalyticsAction('progress', validProgress({ position: 21 })), null);
  assert.equal(normalizeAnalyticsAction('complete', { result: { estimatedLevel: 'B2' } }), null);
  assert.equal(normalizeAnalyticsAction('abandon', { lastPosition: 21 }), null);
  assert.equal(normalizeAnalyticsAction('share', { channel: 'raw-user-text' }), null);

  assert.deepEqual(
    plain(normalizeAnalyticsAction('view', {
      questionId: 'en-b2-004',
      position: 4,
      prompt: 'raw content',
      profile: { name: 'PII' },
    })),
    {
      action: 'view',
      payload: {
        questionId: 'en-b2-004',
        position: 4,
        testLanguage: 'en',
        uiLocale: 'en',
      },
    },
  );
});

test('invalid analytics actions return 400 before rate limits or attempt access', () => {
  const handlerStart = source.indexOf('exports.englishTestApi = onRequest');
  const handlerEnd = source.indexOf('async function updateDailyAggregate');
  const handler = source.slice(handlerStart, handlerEnd);
  const validation = handler.indexOf('normalizeAnalyticsAction(action, body)');
  const invalidResponse = handler.indexOf("res.status(400).json({ error: 'Invalid request' })", validation);
  const rateLimit = handler.indexOf('checkAnalyticsRateLimits', validation);
  const attemptAccess = handler.indexOf('getOrCreateAttempt', validation);

  assert.ok(validation >= 0, 'normalized action validation is missing');
  assert.ok(validation < invalidResponse && invalidResponse < rateLimit);
  assert.ok(rateLimit < attemptAccess);
  assert.match(handler, /ipAddress:\s*getTrustedExternalClientIp\(req\)/);
});

test('analytics rate state enforces independent client and shared-IP hourly caps', () => {
  const nextRateLimitState = loadFunction('nextRateLimitState', {
    RATE_LIMIT_WINDOW_MS: 3600000,
  });
  assert.deepEqual(
    plain(nextRateLimitState({ count: 179, windowStart: 1000 }, 180, 2000)),
    { allowed: true, count: 180, windowStart: 1000 },
  );
  assert.equal(nextRateLimitState({ count: 180, windowStart: 1000 }, 180, 2000).allowed, false);
  assert.deepEqual(
    plain(nextRateLimitState({ count: 1199, windowStart: 1000 }, 1200, 2000)),
    { allowed: true, count: 1200, windowStart: 1000 },
  );
  assert.equal(nextRateLimitState({ count: 1200, windowStart: 1000 }, 1200, 2000).allowed, false);
  assert.deepEqual(
    plain(nextRateLimitState({ count: 9999, windowStart: 0 }, 60, 3600001)),
    { allowed: true, count: 1, windowStart: 3600001 },
  );
});

test('analytics client and IP buckets are HMAC-addressed and atomically updated without raw IP', () => {
  assert.match(source, /ANALYTICS_RATE_LIMIT\s*=\s*180/);
  assert.match(source, /ANALYTICS_SHARED_IP_RATE_LIMIT\s*=\s*1200/);
  const rateFunction = source.slice(
    source.indexOf('async function checkAnalyticsRateLimits'),
    source.indexOf('// ---------- Attempt Management ----------'),
  );
  assert.match(rateFunction, /hmac\(hmacKey,\s*`analytics-client:\$\{clientHash\}`\)/);
  assert.match(rateFunction, /hmac\(hmacKey,\s*`analytics-ip:\$\{ipAddress\}`\)/);
  assert.equal(
    (rateFunction.match(/collection\('english_test_rate_limits'\)/g) || []).length,
    2,
  );
  assert.doesNotMatch(rateFunction, /english_test_ip_rate_limits/);
  assert.match(rateFunction, /db\.runTransaction/);
  const firstWrite = rateFunction.indexOf('transaction.set');
  const clientRead = rateFunction.indexOf('transaction.get(clientRef)');
  const ipRead = rateFunction.indexOf('transaction.get(ipRef)');
  assert.ok(clientRead >= 0 && ipRead >= 0 && clientRead < firstWrite && ipRead < firstWrite);
  assert.doesNotMatch(rateFunction, /\.doc\(ipAddress\)|transaction\.set\([\s\S]*?ipAddress\s*[,}]/);
});

test('analytics infrastructure contract uses the revised bank, usable rate limit, and FieldValue API', () => {
  assert.match(source, /BANK_VERSION = '2026-07-22\.4'/);
  const rateLimit = source.match(/ANALYTICS_RATE_LIMIT\s*=\s*(\d+)/);
  assert.ok(rateLimit, 'ANALYTICS_RATE_LIMIT must be explicit');
  assert.equal(Number(rateLimit[1]), 180, 'analytics must permit three max-flow retakes per hour');
  assert.match(
    source,
    /const\s*\{[^}]*\bFieldValue\b[^}]*\}\s*=\s*require\('firebase-admin\/firestore'\)/s,
  );
  assert.match(source, /FieldValue\.increment\(1\)/);
  assert.doesNotMatch(source, /getFirestore\.FieldValue/);
  const aggregate = source.slice(
    source.indexOf('async function updateDailyAggregate'),
    source.indexOf('// ---------- Admin Callable ----------'),
  );
  assert.doesNotMatch(
    aggregate,
    /events:\s*\{\s*\[action\]:\s*1\s*\}/,
    'daily aggregate must not seed 1 and then increment the same event to 2',
  );
});
