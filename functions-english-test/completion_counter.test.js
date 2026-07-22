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

test("normalizes missing, invalid, fractional, and sub-baseline totals to 124000", () => {
  const { BASELINE_COMPLETED, normalizeCompleted } = subject();
  assert.equal(BASELINE_COMPLETED, 124000);
  for (const value of [
    undefined,
    null,
    NaN,
    Infinity,
    123999,
    124000.5,
    "124001",
  ]) {
    assert.equal(normalizeCompleted(value), 124000);
  }
  assert.equal(normalizeCompleted(124321), 124321);
});

test("first unique completion initializes the baseline and returns 124001", async () => {
  const { countCompletion } = subject();
  const db = new FakeFirestore();
  const result = await countCompletion({
    db,
    completionId: ID_A,
    ipAddress: IP,
    hmacKey: KEY,
    nowMs: 1000,
  });
  assert.deepEqual(result, { completed: 124001, duplicate: false });
  assert.equal(db.docs.get("english_test_public/totals").completed, 124001);
});

test("duplicate completion returns the current count without incrementing or consuming rate limit", async () => {
  const { countCompletion } = subject();
  const db = new FakeFirestore();
  await countCompletion({
    db,
    completionId: ID_A,
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
    ipAddress: IP,
    hmacKey: KEY,
    nowMs: 2000,
  });
  const after = [...db.docs.entries()].find(([path]) =>
    path.startsWith("english_test_completion_rate_limits/"),
  )[1].count;
  assert.deepEqual(duplicate, { completed: 124001, duplicate: true });
  assert.equal(after, before);
});

test("two concurrent requests with the same completion ID increment exactly once", async () => {
  const { countCompletion } = subject();
  const db = new FakeFirestore();
  const request = () =>
    countCompletion({
      db,
      completionId: ID_A,
      ipAddress: IP,
      hmacKey: KEY,
      nowMs: 1000,
    });
  const results = await Promise.all([request(), request()]);
  assert.equal(results.filter((value) => value.duplicate === false).length, 1);
  assert.equal(results.filter((value) => value.duplicate === true).length, 1);
  assert.equal(db.docs.get("english_test_public/totals").completed, 124001);
});

test("rate limit counts only new completion IDs and rejects the twenty-first new ID", async () => {
  const { CompletionRateLimitError, countCompletion } = subject();
  const db = new FakeFirestore();
  for (let index = 0; index < 20; index += 1) {
    const completionId = index.toString(16).padStart(48, "0");
    await countCompletion({
      db,
      completionId,
      ipAddress: IP,
      hmacKey: KEY,
      nowMs: 1000 + index,
    });
  }
  const duplicate = await countCompletion({
    db,
    completionId: "0".repeat(48),
    ipAddress: IP,
    hmacKey: KEY,
    nowMs: 2000,
  });
  assert.equal(duplicate.duplicate, true);
  await assert.rejects(
    countCompletion({
      db,
      completionId: "f".repeat(48),
      ipAddress: IP,
      hmacKey: KEY,
      nowMs: 2001,
    }),
    CompletionRateLimitError,
  );
  assert.equal(db.docs.get("english_test_public/totals").completed, 124020);
});

test("invalid completion payloads are rejected before any Firestore transaction or write", async () => {
  const { countCompletion, isValidCompletionPayload } = subject();
  const invalidPayloads = [
    null,
    {},
    { action: "count_complete", completionId: "A".repeat(48) },
    { action: "count_complete", completionId: "a".repeat(47) },
    {
      action: "count_complete",
      completionId: "a".repeat(48),
      result: { level: "C2" },
    },
    { action: "complete", completionId: "a".repeat(48) },
  ];
  for (const payload of invalidPayloads)
    assert.equal(isValidCompletionPayload(payload), false);

  const db = new FakeFirestore();
  await assert.rejects(
    countCompletion({
      db,
      completionId: "invalid",
      ipAddress: IP,
      hmacKey: KEY,
      nowMs: 1000,
    }),
    /completionId/,
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
    ipAddress: IP,
    hmacKey: "first-secret",
    nowMs: 1000,
  });
  await countCompletion({
    db: secondDb,
    completionId: ID_A,
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
