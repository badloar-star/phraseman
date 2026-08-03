const test = require("node:test");
const assert = require("node:assert/strict");

function subject() {
  return require("./completion_counter");
}

class FakeFirestore {
  constructor(seed = {}) {
    this.docs = new Map(Object.entries(seed));
    this.transactionCount = 0;
    this.writeCount = 0;
    this._tail = Promise.resolve();
  }

  collection(name) {
    return {
      doc: (id) => ({ path: `${name}/${id}` }),
    };
  }

  async runTransaction(worker) {
    this.transactionCount += 1;
    const previous = this._tail;
    let release;
    this._tail = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    let wrote = false;
    const transaction = {
      get: async (ref) => {
        assert.equal(
          wrote,
          false,
          "Firestore transactions must perform every read before the first write",
        );
        const value = this.docs.get(ref.path);
        return {
          exists: value !== undefined,
          data: () => value,
        };
      },
      set: (ref, value, options) => {
        wrote = true;
        this.writeCount += 1;
        const previousValue = this.docs.get(ref.path) || {};
        this.docs.set(
          ref.path,
          options?.merge ? { ...previousValue, ...value } : { ...value },
        );
      },
    };
    try {
      return await worker(transaction);
    } finally {
      release();
    }
  }
}

const KEY = "test-hmac-key-with-enough-entropy";
const IP = "203.0.113.10";
const ID_A = "a".repeat(48);
const ID_B = "b".repeat(48);
const ZERO_BY_LANGUAGE = { en: 0, de: 0, fr: 0, it: 0, es: 0 };

test("normalizes missing, invalid, and fractional English totals from zero", () => {
  const { BASELINE_COMPLETED, BASELINE_COMPLETED_BY_LANGUAGE, normalizeCompleted, normalizeCompletedByLanguage } = subject();
  // зачем: владелец 2026-08-02 — старая база 124000 для английского (легаси-точка
  // ДО введения счётчика) тоже нечестная. Все языки равны, база всех — 0.
  assert.equal(BASELINE_COMPLETED, 0);
  assert.deepEqual(BASELINE_COMPLETED_BY_LANGUAGE, ZERO_BY_LANGUAGE);
  for (const value of [undefined, null, NaN, Infinity, -1, "7"]) {
    assert.equal(normalizeCompleted(value), 0);
  }
  assert.equal(normalizeCompleted(321), 321);

  assert.deepEqual(normalizeCompletedByLanguage(undefined), ZERO_BY_LANGUAGE);
  assert.deepEqual(
    normalizeCompletedByLanguage({ en: 42, de: -1, fr: 7, it: NaN, es: "9" }),
    { en: 42, de: 0, fr: 7, it: 0, es: 0 },
  );
});

test("first unique English completion starts at one", async () => {
  const { countCompletion } = subject();
  const db = new FakeFirestore();
  const result = await countCompletion({
    db, completionId: ID_A, testLanguage: "en", ipAddress: IP, hmacKey: KEY, nowMs: 1000,
  });
  assert.deepEqual(result, { completed: 1, duplicate: false });
  assert.deepEqual(db.docs.get("english_test_public/totals"), {
    completed: 1,
    completedByLanguage: { ...ZERO_BY_LANGUAGE, en: 1 },
  });
});

test("legacy total is preserved as English until the per-language map exists", async () => {
  const { countCompletion, normalizeCompletedByLanguage } = subject();
  assert.deepEqual(normalizeCompletedByLanguage(undefined, 124000), {
    ...ZERO_BY_LANGUAGE, en: 124000,
  });

  const db = new FakeFirestore({
    "english_test_public/totals": { completed: 124000 },
  });
  const result = await countCompletion({
    db,
    completionId: ID_A,
    testLanguage: "en",
    ipAddress: IP,
    hmacKey: KEY,
    nowMs: 1000,
  });

  assert.deepEqual(result, { completed: 124001, duplicate: false });
  assert.deepEqual(db.docs.get("english_test_public/totals"), {
    completed: 124001,
    completedByLanguage: { ...ZERO_BY_LANGUAGE, en: 124001 },
  });
});

test("released-language completions accumulate in independent buckets", async () => {
  const { countCompletion } = subject();
  const db = new FakeFirestore();
  await countCompletion({ db, completionId: "1".repeat(48), testLanguage: "en", ipAddress: IP, hmacKey: KEY, nowMs: 1000 });
  await countCompletion({ db, completionId: "2".repeat(48), testLanguage: "en", ipAddress: IP, hmacKey: KEY, nowMs: 1001 });
  await countCompletion({ db, completionId: "3".repeat(48), testLanguage: "de", ipAddress: IP, hmacKey: KEY, nowMs: 1002 });
  const totals = db.docs.get("english_test_public/totals");
  assert.deepEqual(totals.completedByLanguage, { ...ZERO_BY_LANGUAGE, en: 2, de: 1 });
  assert.equal(totals.completed, 3);
});

test("duplicate completion returns the current count without incrementing or consuming rate limit", async () => {
  const { countCompletion } = subject();
  const db = new FakeFirestore();
  await countCompletion({
    db,
    completionId: ID_A,
    testLanguage: "en",
    ipAddress: IP,
    hmacKey: KEY,
    nowMs: 1000,
  });
  const before = [...db.docs.entries()].find(([path]) =>
    path.startsWith("english_test_completion_rate_limits/"),
  )[1].count;
  const duplicate = await countCompletion({
    db,
    completionId: ID_A,
    testLanguage: "en",
    ipAddress: IP,
    hmacKey: KEY,
    nowMs: 2000,
  });
  const after = [...db.docs.entries()].find(([path]) =>
    path.startsWith("english_test_completion_rate_limits/"),
  )[1].count;
  assert.deepEqual(duplicate, { completed: 1, duplicate: true });
  assert.equal(after, before);
});

test("two concurrent requests with the same completion ID increment exactly once", async () => {
  const { countCompletion } = subject();
  const db = new FakeFirestore();
  const request = () =>
    countCompletion({
      db,
      completionId: ID_A,
      testLanguage: "en",
      ipAddress: IP,
      hmacKey: KEY,
      nowMs: 1000,
    });
  const results = await Promise.all([request(), request()]);
  assert.equal(results.filter((value) => value.duplicate === false).length, 1);
  assert.equal(results.filter((value) => value.duplicate === true).length, 1);
  assert.equal(db.docs.get("english_test_public/totals").completed, 1);
});

test("rate limit counts only new completion IDs and rejects the twenty-first new ID", async () => {
  const { CompletionRateLimitError, countCompletion } = subject();
  const db = new FakeFirestore();
  for (let index = 0; index < 20; index += 1) {
    const completionId = index.toString(16).padStart(48, "0");
    await countCompletion({
      db,
      completionId,
      testLanguage: "en",
      ipAddress: IP,
      hmacKey: KEY,
      nowMs: 1000 + index,
    });
  }
  const duplicate = await countCompletion({
    db,
    completionId: "0".repeat(48),
    testLanguage: "en",
    ipAddress: IP,
    hmacKey: KEY,
    nowMs: 2000,
  });
  assert.equal(duplicate.duplicate, true);
  await assert.rejects(
    countCompletion({
      db,
      completionId: "f".repeat(48),
      testLanguage: "en",
      ipAddress: IP,
      hmacKey: KEY,
      nowMs: 2001,
    }),
    CompletionRateLimitError,
  );
  assert.equal(db.docs.get("english_test_public/totals").completed, 20);
});

test("invalid completion payloads are rejected before any Firestore transaction or write", async () => {
  const { countCompletion, isValidCompletionPayload } = subject();
  const invalidPayloads = [
    null,
    {},
    { action: "count_complete", completionId: "A".repeat(48), testLanguage: "en" },
    { action: "count_complete", completionId: "a".repeat(47), testLanguage: "en" },
    { action: "count_complete", completionId: "a".repeat(48) },
    { action: "count_complete", completionId: "a".repeat(48), testLanguage: "xx" },
    {
      action: "count_complete",
      completionId: "a".repeat(48),
      testLanguage: "en",
      result: { level: "C2" },
    },
    { action: "complete", completionId: "a".repeat(48), testLanguage: "en" },
  ];
  for (const payload of invalidPayloads)
    assert.equal(isValidCompletionPayload(payload), false);
  assert.equal(
    isValidCompletionPayload({ action: "count_complete", completionId: "a".repeat(48), testLanguage: "en" }),
    true,
  );

  const db = new FakeFirestore();
  await assert.rejects(
    countCompletion({
      db,
      completionId: "invalid",
      testLanguage: "en",
      ipAddress: IP,
      hmacKey: KEY,
      nowMs: 1000,
    }),
    /completionId/,
  );
  await assert.rejects(
    countCompletion({
      db,
      completionId: ID_A,
      testLanguage: "xx",
      ipAddress: IP,
      hmacKey: KEY,
      nowMs: 1000,
    }),
    /testLanguage/,
  );
  assert.equal(db.transactionCount, 0);
  assert.equal(db.writeCount, 0);
});

test("receipt and IP rate-limit keys are cryptographic hashes and stored documents contain no result, level, UA, clientHash, raw IP, or TTL receipt", async () => {
  const { countCompletion } = subject();
  const db = new FakeFirestore();
  await countCompletion({
    db,
    completionId: ID_A,
    testLanguage: "en",
    ipAddress: IP,
    hmacKey: KEY,
    nowMs: 1000,
  });
  const receiptEntry = [...db.docs.entries()].find(([path]) =>
    path.startsWith("english_test_completion_receipts/"),
  );
  const rateEntry = [...db.docs.entries()].find(([path]) =>
    path.startsWith("english_test_completion_rate_limits/"),
  );
  assert.match(
    receiptEntry[0],
    /^english_test_completion_receipts\/[a-f0-9]{64}$/,
  );
  assert.match(
    rateEntry[0],
    /^english_test_completion_rate_limits\/[a-f0-9]{64}$/,
  );
  assert.equal(receiptEntry[0].includes(ID_A), false);
  assert.equal(rateEntry[0].includes(IP), false);
  assert.deepEqual(Object.keys(receiptEntry[1]).sort(), ["createdAtMs"]);
  const serialized = JSON.stringify([...db.docs.entries()]);
  for (const forbidden of [
    "estimatedLevel",
    "result",
    "userAgent",
    "clientHash",
    IP,
    ID_A,
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("receipt ID stays identical across HMAC secret rotation while IP rate-limit IDs rotate", async () => {
  const { countCompletion } = subject();
  const firstDb = new FakeFirestore();
  const secondDb = new FakeFirestore();
  await countCompletion({
    db: firstDb,
    completionId: ID_A,
    testLanguage: "en",
    ipAddress: IP,
    hmacKey: "first-secret",
    nowMs: 1000,
  });
  await countCompletion({
    db: secondDb,
    completionId: ID_A,
    testLanguage: "en",
    ipAddress: IP,
    hmacKey: "rotated-secret",
    nowMs: 1000,
  });
  const receiptPath = (database) =>
    [...database.docs.keys()].find((path) =>
      path.startsWith("english_test_completion_receipts/"),
    );
  const ratePath = (database) =>
    [...database.docs.keys()].find((path) =>
      path.startsWith("english_test_completion_rate_limits/"),
    );
  assert.equal(receiptPath(firstDb), receiptPath(secondDb));
  assert.notEqual(ratePath(firstDb), ratePath(secondDb));
});
