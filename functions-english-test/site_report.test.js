const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SITE_REPORT_COMMENT_MIN_LENGTH,
  buildSiteReportDocument,
  normalizeSiteReportPayload,
  siteReportRateKey,
} = require('./site_report');

function validPayload(overrides = {}) {
  return {
    questionId: 'en-b1-014',
    position: 7,
    testLanguage: 'en',
    uiLocale: 'ru',
    bankVersion: '2026-07-22.4',
    comment: 'Кажется, в вопросе есть ошибка.',
    dataText: 'Context: At the station\nQuestion: Choose the correct answer.\nA. since\nB. ago',
    userAnswer: 'A. since',
    clientHash: 'a'.repeat(48),
    attemptToken: 'b'.repeat(48),
    ...overrides,
  };
}

test('accepts a bounded English-test site report and strips unknown fields', () => {
  assert.deepEqual(normalizeSiteReportPayload(validPayload({ admin: true })), {
    questionId: 'en-b1-014',
    position: 7,
    testLanguage: 'en',
    uiLocale: 'ru',
    bankVersion: '2026-07-22.4',
    comment: 'Кажется, в вопросе есть ошибка.',
    dataText: 'Context: At the station\nQuestion: Choose the correct answer.\nA. since\nB. ago',
    userAnswer: 'A. since',
    clientHash: 'a'.repeat(48),
    attemptToken: 'b'.repeat(48),
  });
});

test('rejects malformed identities, short comments, and unsupported locales', () => {
  const invalid = [
    validPayload({ questionId: 'raw-question' }),
    validPayload({ testLanguage: 'fr' }),
    validPayload({ questionId: 'de-b1-014' }),
    validPayload({ position: 0 }),
    validPayload({ position: 21 }),
    validPayload({ comment: 'x'.repeat(SITE_REPORT_COMMENT_MIN_LENGTH - 1) }),
    validPayload({ uiLocale: 'pt' }),
    validPayload({ clientHash: 'not-a-browser-id' }),
    validPayload({ dataText: '' }),
  ];

  for (const payload of invalid) assert.equal(normalizeSiteReportPayload(payload), null);
});

test('bounds all client-controlled text before it reaches Firestore', () => {
  const normalized = normalizeSiteReportPayload(validPayload({
    comment: `  ${'c'.repeat(700)}  `,
    dataText: `  ${'d'.repeat(4000)}  `,
    userAnswer: 'u'.repeat(1200),
  }));

  assert.equal(normalized.comment.length, 500);
  assert.equal(normalized.dataText.length, 2500);
  assert.equal(normalized.userAnswer.length, 500);
});

test('builds an admin-compatible error_reports document with an explicit site marker', () => {
  const normalized = normalizeSiteReportPayload(validPayload());
  const doc = buildSiteReportDocument(normalized, 1_722_600_000_000);

  assert.equal(doc.source, 'site');
  assert.equal(doc.platform, 'web');
  assert.equal(doc.screen, 'Сайт · языковой тест');
  assert.equal(doc.userName, 'Сайт');
  assert.equal(doc.category, 'free_text');
  assert.equal(doc.dataId, 'en-b1-014');
  assert.equal(doc.status, 'new');
  assert.equal(doc.fixed, false);
  assert.equal(doc.createdAtMs, 1_722_600_000_000);
  assert.match(doc.copyText, /source:\s+site/);
  assert.match(doc.copyText, /questionId:\s+en-b1-014/);
  assert.ok(!Object.hasOwn(doc, 'clientHash'));
  assert.ok(!Object.hasOwn(doc, 'attemptToken'));
});

test('rate-limit keys are deterministic, scoped, and do not expose raw IP or browser IDs', () => {
  const first = siteReportRateKey('203.0.113.9', 'a'.repeat(48), 'secret');
  const same = siteReportRateKey('203.0.113.9', 'a'.repeat(48), 'secret');
  const other = siteReportRateKey('203.0.113.10', 'a'.repeat(48), 'secret');

  assert.equal(first, same);
  assert.notEqual(first, other);
  assert.match(first, /^site_[a-f0-9]{48}$/);
  assert.ok(!first.includes('203.0.113.9'));
  assert.ok(!first.includes('a'.repeat(48)));
});

test('the public API validates and rate-limits site reports before creating error_reports docs', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const reportBranch = source.slice(
    source.indexOf("if (action === 'report_error')"),
    source.indexOf('// Analytics retains its existing consent-dependent client contract.'),
  );

  assert.match(reportBranch, /normalizeSiteReportPayload\(body\)/);
  assert.match(reportBranch, /checkSiteReportRateLimit\(/);
  assert.match(reportBranch, /buildSiteReportDocument\(/);
  assert.match(reportBranch, /db\.collection\('error_reports'\)\.add\(doc\)/);
  assert.match(reportBranch, /getTrustedExternalClientIp\(req\)/);
  assert.match(reportBranch, /isBotUA\(reportUserAgent\)/);
  assert.match(reportBranch, /res\.status\(429\)/);
  assert.doesNotMatch(reportBranch, /req\.body\s*\}/);
});

test('scheduled cleanup removes expired site-report rate buckets', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const cleanup = source.slice(source.indexOf('exports.cleanupEnglishTestAnalytics'));
  assert.match(cleanup, /name:\s*'english_test_report_rate_limits',\s*field:\s*'expiresAt'/);
});
