"use strict";

const crypto = require('node:crypto');

const SITE_REPORT_COMMENT_MIN_LENGTH = 10;
const SITE_REPORT_RATE_WINDOW_MS = 60 * 60 * 1000;
const SITE_REPORT_CLIENT_RATE_LIMIT = 5;
const SITE_REPORT_IP_RATE_LIMIT = 20;
const SITE_REPORT_RATE_COLLECTION = 'english_test_report_rate_limits';
const TEST_LANGUAGES = new Set(['en', 'de', 'fr', 'it', 'es']);
const UI_LOCALES = new Set(['ru', 'en', 'de', 'es', 'it', 'fr']);
const QUESTION_ID_PATTERN = /^(en|de|fr|it|es)-(a1|a2|b1|b2|c1|c2)-\d{3}$/;
const TOKEN_PATTERN = /^[a-f0-9]{48}$/;
const BANK_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}\.\d+$/;

function cleanText(value, maxLength, multiline = false) {
  if (typeof value !== 'string') return '';
  let output = value.normalize('NFC');
  output = multiline
    ? output.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '')
    : output.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ');
  output = output.replace(/[\u202a-\u202e\u2066-\u2069]/gi, '').trim();
  return output.slice(0, maxLength);
}

function normalizeSiteReportPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const questionId = cleanText(value.questionId, 32);
  const match = questionId.match(QUESTION_ID_PATTERN);
  const position = value.position;
  const testLanguage = cleanText(value.testLanguage, 8);
  const uiLocale = cleanText(value.uiLocale, 8);
  const bankVersion = cleanText(value.bankVersion, 32);
  const comment = cleanText(value.comment, 500, true);
  const dataText = cleanText(value.dataText, 2500, true);
  const userAnswer = cleanText(value.userAnswer, 500, true);
  const clientHash = cleanText(value.clientHash, 48);
  const attemptToken = cleanText(value.attemptToken, 48);

  if (!match || match[1] !== testLanguage || !TEST_LANGUAGES.has(testLanguage)) return null;
  if (!Number.isInteger(position) || position < 1 || position > 20) return null;
  if (!UI_LOCALES.has(uiLocale)) return null;
  if (!BANK_VERSION_PATTERN.test(bankVersion)) return null;
  if (comment.length < SITE_REPORT_COMMENT_MIN_LENGTH || !dataText) return null;
  if (!TOKEN_PATTERN.test(clientHash) || !TOKEN_PATTERN.test(attemptToken)) return null;

  return {
    questionId,
    position,
    testLanguage,
    uiLocale,
    bankVersion,
    comment,
    dataText,
    userAnswer,
    clientHash,
    attemptToken,
  };
}

function buildSiteReportDocument(payload, now = Date.now()) {
  const copyText = [
    '=== PHRASEMAN SITE REPORT ===',
    'source:     site',
    `questionId: ${payload.questionId}`,
    `position:   ${payload.position}`,
    `test:       ${payload.testLanguage}`,
    `interface:  ${payload.uiLocale}`,
    `bank:       ${payload.bankVersion}`,
    'content:',
    ...payload.dataText.split('\n').map((line) => `  ${line}`),
    payload.userAnswer ? `userAnswer: ${payload.userAnswer}` : '',
    `comment:    ${payload.comment}`,
    '===============================',
  ].filter(Boolean).join('\n');

  return {
    source: 'site',
    platform: 'web',
    appVersion: 'english-level-test',
    screen: 'Сайт · языковой тест',
    category: 'free_text',
    dataId: payload.questionId,
    dataText: payload.dataText,
    userAnswer: payload.userAnswer,
    comment: payload.comment,
    userName: 'Сайт',
    userLanguage: payload.uiLocale,
    testLanguage: payload.testLanguage,
    questionPosition: payload.position,
    bankVersion: payload.bankVersion,
    copyText,
    status: 'new',
    fixed: false,
    createdAt: new Date(now).toISOString(),
    createdAtMs: now,
  };
}

function keyedRateHash(scope, value, hmacKey) {
  return crypto.createHmac('sha256', hmacKey).update(`${scope}|${value}`).digest('hex').slice(0, 48);
}

function siteReportRateKey(ipAddress, clientHash, hmacKey) {
  return `site_${keyedRateHash('combined', `${ipAddress}|${clientHash}`, hmacKey)}`;
}

async function checkSiteReportRateLimit({ db, ipAddress, clientHash, hmacKey, now = Date.now() }) {
  const scopes = [
    { key: `client_${keyedRateHash('client', clientHash, hmacKey)}`, limit: SITE_REPORT_CLIENT_RATE_LIMIT },
  ];
  if (ipAddress) {
    scopes.push({ key: `ip_${keyedRateHash('ip', ipAddress, hmacKey)}`, limit: SITE_REPORT_IP_RATE_LIMIT });
  }

  return db.runTransaction(async (tx) => {
    const records = [];
    for (const scope of scopes) {
      const ref = db.collection(SITE_REPORT_RATE_COLLECTION).doc(scope.key);
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() || {} : {};
      const previousStart = Number(data.windowStartMs) || 0;
      const sameWindow = now - previousStart < SITE_REPORT_RATE_WINDOW_MS;
      const count = sameWindow ? Number(data.count) || 0 : 0;
      if (count >= scope.limit) {
        const retryAfter = Math.max(1, Math.ceil((previousStart + SITE_REPORT_RATE_WINDOW_MS - now) / 1000));
        return { allowed: false, retryAfter };
      }
      records.push({ ref, scope, count, windowStartMs: sameWindow ? previousStart : now });
    }

    for (const record of records) {
      tx.set(record.ref, {
        scope: record.scope.key.startsWith('ip_') ? 'ip' : 'client',
        windowStartMs: record.windowStartMs,
        count: record.count + 1,
        updatedAtMs: now,
        expiresAt: new Date(now + 2 * SITE_REPORT_RATE_WINDOW_MS),
      }, { merge: true });
    }
    return { allowed: true, retryAfter: 0 };
  });
}

module.exports = {
  SITE_REPORT_COMMENT_MIN_LENGTH,
  buildSiteReportDocument,
  checkSiteReportRateLimit,
  normalizeSiteReportPayload,
  siteReportRateKey,
};
