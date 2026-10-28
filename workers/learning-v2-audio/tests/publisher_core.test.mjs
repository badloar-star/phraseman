import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { publishValidatedPlanToR2 } from "../scripts/publisher_core.mjs";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const immutableBytes = Uint8Array.from([1, 2, 3]);
const immutableSha = sha(immutableBytes);
const currentBytes = Uint8Array.from([4, 5]);
const currentSha = sha(currentBytes);
const immutable = {
  objectPath: `learning-v2/voice-audio/v1/es/packs/base-sessions-1-${immutableSha}.bin`,
  byteSize: 3,
  sha256: immutableSha,
  immutable: true,
  bytes: immutableBytes,
};
const current = {
  objectPath: "learning-v2/voice-audio/v1/es/current.json",
  byteSize: 2,
  sha256: currentSha,
  immutable: false,
  bytes: currentBytes,
};

test("creates immutable objects conditionally, verifies them, and writes current last", async () => {
  const events = [];
  const remote = new Map();
  const result = await publishValidatedPlanToR2({
    releaseId: "c".repeat(64),
    expectedPriorCurrentSha: null,
    objects: [immutable, current],
    head: async (key) => remote.get(key)?.metadata ?? null,
    put: async (object, condition) => {
      events.push(`put:${object.objectPath}:${condition}`);
      remote.set(object.objectPath, {
        bytes: object.bytes,
        metadata: { byteSize: object.byteSize, sha256: object.sha256 },
      });
    },
    get: async (key) => {
      events.push(`get:${key}`);
      return remote.get(key) ?? null;
    },
  });

  assert.deepEqual(events, [
    `put:${immutable.objectPath}:create`,
    `get:${immutable.objectPath}`,
    `put:${current.objectPath}:replace`,
    `get:${current.objectPath}`,
  ]);
  assert.deepEqual(result, { created: 1, skipped: 0, currentUpdated: true });
});

test("fails on immutable conflict before publishing current", async () => {
  const puts = [];
  await assert.rejects(
    publishValidatedPlanToR2({
      releaseId: "c".repeat(64),
      expectedPriorCurrentSha: null,
      objects: [immutable, current],
      head: async (key) =>
        key === immutable.objectPath
          ? { byteSize: 99, sha256: "f".repeat(64) }
          : null,
      put: async (object) => puts.push(object.objectPath),
      get: async () => null,
    }),
    /immutable_conflict/u,
  );
  assert.deepEqual(puts, []);
});

test("skips matching objects but still verifies remote bytes by SHA and size", async () => {
  const gets = [];
  const result = await publishValidatedPlanToR2({
    releaseId: "c".repeat(64),
    expectedPriorCurrentSha: null,
    objects: [immutable, current],
    head: async (key) => {
      const object = key === immutable.objectPath ? immutable : current;
      return { byteSize: object.byteSize, sha256: object.sha256 };
    },
    put: async () => assert.fail("matching object must not be overwritten"),
    get: async (key) => {
      gets.push(key);
      const object = key === immutable.objectPath ? immutable : current;
      return { bytes: object.bytes };
    },
  });
  assert.deepEqual(gets, [immutable.objectPath, current.objectPath]);
  assert.deepEqual(result, { created: 0, skipped: 2, currentUpdated: false });
});

test("rejects a publication plan where current is not last", async () => {
  await assert.rejects(
    publishValidatedPlanToR2({
      releaseId: "c".repeat(64),
      expectedPriorCurrentSha: null,
      objects: [current, immutable],
      head: async () => null,
      put: async () => undefined,
      get: async () => null,
    }),
    /current_must_be_last/u,
  );
});

test("rejects a stale current pointer before replacing it", async () => {
  const puts = [];
  await assert.rejects(
    publishValidatedPlanToR2({
      releaseId: "c".repeat(64),
      expectedPriorCurrentSha: "d".repeat(64),
      objects: [immutable, current],
      head: async (key) =>
        key === current.objectPath
          ? {
              byteSize: 10,
              sha256: "e".repeat(64),
              etag: '"remote-current"',
            }
          : null,
      put: async (object) => puts.push(object.objectPath),
      get: async (key) =>
        key === immutable.objectPath ? { bytes: immutable.bytes } : null,
    }),
    /stale_current/u,
  );
  assert.deepEqual(puts, [immutable.objectPath]);
});
