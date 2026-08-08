"use strict";

const crypto = require("crypto");

// 2026-08-02 — владелец решил, что старая база 124000 для английского
// (легаси-точка ДО введения счётчика) тоже нечестная. Сама база 124000
// вычтена из документа english_test_public/totals ОДНОРАЗОВОЙ миграцией
// (scripts/migrate_remove_english_baseline.js), реальные завершения
// сохранены. Здесь английская база — честный 0.
const TEST_LANGUAGES = ["en", "de", "fr", "it", "es"];
const BASELINE_COMPLETED = 0;
const BASELINE_COMPLETED_BY_LANGUAGE = { en: 0, de: 0, fr: 0, it: 0, es: 0 };
const COMPLETION_RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const COMPLETION_ID_PATTERN = /^[a-f0-9]{48}$/;

class CompletionRateLimitError extends Error {
  constructor(retryAfterSeconds) {
    super("Completion rate limited");
    this.name = "CompletionRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function hmac(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeTestLanguage(value) {
  return TEST_LANGUAGES.includes(value) ? value : null;
}

function normalizeCompletedForLanguage(language, value) {
  const baseline = BASELINE_COMPLETED_BY_LANGUAGE[normalizeTestLanguage(language)];
  return Number.isSafeInteger(value) && value >= baseline ? value : baseline;
}

// зачем: остаётся для старых клиентов (кэш в localStorage), которые ещё
// читают общее число вместо completedByLanguage; нормализует к en-базе (0).
function normalizeCompleted(value) {
  return normalizeCompletedForLanguage("en", value);
}

function normalizeCompletedByLanguage(data, legacyCompleted) {
  const result = {};
  for (const language of TEST_LANGUAGES) {
    result[language] = normalizeCompletedForLanguage(language, data?.[language]);
  }
  // Existing production documents may predate the per-language map. Preserve
  // their aggregate as English until the separate one-time migration is run;
  // otherwise the public counter drops to zero and the next completion erases
  // the legacy total. Once a map exists, it remains the only source of truth.
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    result.en = normalizeCompleted(legacyCompleted);
  }
  return result;
}

function isValidCompletionId(value) {
  return typeof value === "string" && COMPLETION_ID_PATTERN.test(value);
}

function isValidCompletionPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return false;
  const keys = Object.keys(payload).sort();
  return (
    keys.length === 3 &&
    keys[0] === "action" &&
    keys[1] === "completionId" &&
    keys[2] === "testLanguage" &&
    payload.action === "count_complete" &&
    isValidCompletionId(payload.completionId) &&
    TEST_LANGUAGES.includes(payload.testLanguage)
  );
}

function requireServerInputs(completionId, ipAddress, hmacKey) {
  if (!isValidCompletionId(completionId))
    throw new TypeError("Invalid completionId");
  if (
    typeof ipAddress !== "string" ||
    ipAddress.length < 1 ||
    ipAddress.length > 256
  ) {
    throw new TypeError("Invalid server IP address");
  }
  if (typeof hmacKey !== "string" || hmacKey.length < 1)
    throw new TypeError("Invalid HMAC key");
}

async function readCompletedCount(db) {
  const snapshot = await db
    .collection("english_test_public")
    .doc("totals")
    .get();
  return normalizeCompleted(
    snapshot.exists ? snapshot.data()?.completed : undefined,
  );
}

async function readCompletedCountByLanguage(db) {
  const snapshot = await db
    .collection("english_test_public")
    .doc("totals")
    .get();
  const data = snapshot.exists ? snapshot.data() : undefined;
  return normalizeCompletedByLanguage(data?.completedByLanguage, data?.completed);
}

async function countCompletion({
  db,
  completionId,
  testLanguage,
  ipAddress,
  hmacKey,
  nowMs = Date.now(),
}) {
  requireServerInputs(completionId, ipAddress, hmacKey);
  if (!db || typeof db.runTransaction !== "function")
    throw new TypeError("Invalid Firestore dependency");
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new TypeError("Invalid timestamp");
  if (!TEST_LANGUAGES.includes(testLanguage))
    throw new TypeError("Invalid testLanguage");
  const language = testLanguage;

  const receiptId = sha256(completionId);
  const rateLimitId = hmac(hmacKey, `completion-ip:${ipAddress}`);
  const receiptRef = db
    .collection("english_test_completion_receipts")
    .doc(receiptId);
  const counterRef = db.collection("english_test_public").doc("totals");
  const rateLimitRef = db
    .collection("english_test_completion_rate_limits")
    .doc(rateLimitId);

  return db.runTransaction(async (transaction) => {
    const receiptSnapshot = await transaction.get(receiptRef);
    const counterSnapshot = await transaction.get(counterRef);
    const rateLimitSnapshot = await transaction.get(rateLimitRef);
    const counterData = counterSnapshot.exists ? counterSnapshot.data() : undefined;
    const completedByLanguage = normalizeCompletedByLanguage(
      counterData?.completedByLanguage,
      counterData?.completed,
    );
    const completed = completedByLanguage[language];

    if (receiptSnapshot.exists) return { completed, duplicate: true };

    const rateData = rateLimitSnapshot.exists ? rateLimitSnapshot.data() : {};
    const storedWindowStart = rateData?.windowStartMs;
    const activeWindow =
      Number.isSafeInteger(storedWindowStart) &&
      storedWindowStart >= 0 &&
      nowMs - storedWindowStart < RATE_LIMIT_WINDOW_MS;
    const windowStartMs = activeWindow ? storedWindowStart : nowMs;
    const currentRateCount =
      activeWindow &&
      Number.isSafeInteger(rateData?.count) &&
      rateData.count >= 0
        ? rateData.count
        : 0;

    if (currentRateCount >= COMPLETION_RATE_LIMIT) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowStartMs + RATE_LIMIT_WINDOW_MS - nowMs) / 1000),
      );
      throw new CompletionRateLimitError(retryAfterSeconds);
    }

    const nextCompleted = completed + 1;
    const nextCompletedByLanguage = { ...completedByLanguage, [language]: nextCompleted };
    // зачем: старое поле completed держим равным сумме всех языков — клиенты,
    // ещё не обновившиеся на per-language чтение, не увидят число ниже прежнего.
    const nextCompletedTotal = TEST_LANGUAGES.reduce(
      (sum, code) => sum + nextCompletedByLanguage[code],
      0,
    );
    transaction.set(receiptRef, { createdAtMs: nowMs });
    transaction.set(
      counterRef,
      { completed: nextCompletedTotal, completedByLanguage: nextCompletedByLanguage },
      { merge: true },
    );
    transaction.set(rateLimitRef, {
      count: currentRateCount + 1,
      windowStartMs,
      expiresAt: new Date(windowStartMs + RATE_LIMIT_WINDOW_MS * 2),
    });
    return { completed: nextCompleted, duplicate: false };
  });
}

module.exports = {
  BASELINE_COMPLETED,
  BASELINE_COMPLETED_BY_LANGUAGE,
  TEST_LANGUAGES,
  CompletionRateLimitError,
  countCompletion,
  isValidCompletionId,
  isValidCompletionPayload,
  normalizeCompleted,
  normalizeCompletedByLanguage,
  normalizeTestLanguage,
  readCompletedCount,
  readCompletedCountByLanguage,
};
