"use strict";

const crypto = require("crypto");

const BASELINE_COMPLETED = 124000;
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

function normalizeCompleted(value) {
  return Number.isSafeInteger(value) && value >= BASELINE_COMPLETED
    ? value
    : BASELINE_COMPLETED;
}

function isValidCompletionId(value) {
  return typeof value === "string" && COMPLETION_ID_PATTERN.test(value);
}

function isValidCompletionPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return false;
  const keys = Object.keys(payload).sort();
  return (
    keys.length === 2 &&
    keys[0] === "action" &&
    keys[1] === "completionId" &&
    payload.action === "count_complete" &&
    isValidCompletionId(payload.completionId)
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

async function countCompletion({
  db,
  completionId,
  ipAddress,
  hmacKey,
  nowMs = Date.now(),
}) {
  requireServerInputs(completionId, ipAddress, hmacKey);
  if (!db || typeof db.runTransaction !== "function")
    throw new TypeError("Invalid Firestore dependency");
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new TypeError("Invalid timestamp");

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
    const completed = normalizeCompleted(
      counterSnapshot.exists ? counterSnapshot.data()?.completed : undefined,
    );

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
    transaction.set(receiptRef, { createdAtMs: nowMs });
    transaction.set(counterRef, { completed: nextCompleted }, { merge: true });
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
  CompletionRateLimitError,
  countCompletion,
  isValidCompletionId,
  isValidCompletionPayload,
  normalizeCompleted,
  readCompletedCount,
};
