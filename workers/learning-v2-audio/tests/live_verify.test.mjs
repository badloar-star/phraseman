import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLiveObjectSizeHeaders,
  assertLiveVerificationOutcome,
  exactLiveWorkerOrigin,
} from "../scripts/verify_live.mjs";

test("pins live bearer-token verification to the owner Worker origin", () => {
  assert.equal(
    exactLiveWorkerOrigin(
      "https://phraseman-learning-audio.badloar.workers.dev",
    ),
    "https://phraseman-learning-audio.badloar.workers.dev",
  );
  assert.equal(exactLiveWorkerOrigin("https://attacker.example"), null);
  assert.equal(
    exactLiveWorkerOrigin(
      "https://phraseman-learning-audio.badloar.workers.dev/path",
    ),
    null,
  );
});

test("surfaces synthetic-identity cleanup failure over a primary probe failure", () => {
  const primary = new Error("worker_object_integrity");
  assert.throws(
    () => assertLiveVerificationOutcome(primary, true),
    (error) =>
      error instanceof Error &&
      /temporary_identity_cleanup_failed/u.test(error.message) &&
      error.cause === primary,
  );
});

test("preserves a primary probe failure when cleanup succeeds", () => {
  const primary = new Error("worker_object_integrity");
  assert.throws(
    () => assertLiveVerificationOutcome(primary, false),
    (error) => error === primary,
  );
});

test("requires the deployed Worker custom size header to match the object", () => {
  assert.doesNotThrow(() =>
    assertLiveObjectSizeHeaders(
      new Headers({
        "content-length": "3",
        "x-phraseman-content-length": "3",
      }),
      3,
    ),
  );
  assert.throws(
    () => assertLiveObjectSizeHeaders(new Headers({ "content-length": "3" }), 3),
    /worker_size_header/u,
  );
  assert.throws(
    () =>
      assertLiveObjectSizeHeaders(
        new Headers({ "x-phraseman-content-length": "4" }),
        3,
      ),
    /worker_size_header/u,
  );
});
