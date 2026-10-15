import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  germanTask6cFourNounReviewAttemptTestHarnessDeV1,
  runGermanTask6cFourNounReviewAttemptGateDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_four_noun_review_attempt_gate_de_v1";

type RecordValue = Record<string, unknown>;

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as RecordValue).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const pre =
  germanTask6cFourNounReviewAttemptTestHarnessDeV1.readFixedPreForTest();
assert.doesNotThrow(() =>
  germanTask6cFourNounReviewAttemptTestHarnessDeV1.validatePreForTest(pre),
);

const changedClosure = clone(pre) as RecordValue;
(changedClosure.closureEntries as Record<string, unknown>[])[0].sha256 =
  "0".repeat(64);
assert.throws(
  () =>
    germanTask6cFourNounReviewAttemptTestHarnessDeV1.validatePreForTest(
      changedClosure,
    ),
  /FOUR_NOUN_CLOSURE_(?:HASH|ROOT)_MISMATCH/u,
);

const promoted = clone(pre) as RecordValue;
(promoted.status as RecordValue).rowsPromoted = 1;
assert.throws(
  () =>
    germanTask6cFourNounReviewAttemptTestHarnessDeV1.validatePreForTest(
      promoted,
    ),
  /FOUR_NOUN_ATTEMPT_STATUS_INVALID/u,
);

const oldTranscriptSummary = {
  schemaVersion: "learning-v2-de-task6c-l01-independent-review-record.v1",
  recordKind: "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY",
  source: "root message transcript",
  verdict: "PASS",
};
assert.throws(
  () =>
    germanTask6cFourNounReviewAttemptTestHarnessDeV1.verifyReceiptForTest(
      oldTranscriptSummary,
      "NATIVE_GERMAN_REVIEW",
      Buffer.from("unused", "utf8"),
      null,
    ),
  /RUNNER_RECEIPT_KIND_INVALID/u,
);

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey
  .export({ type: "spki", format: "pem" })
  .toString();
const trustRoot = {
  schemaVersion: "learning-v2-runner-trust-root.v1",
  algorithm: "ed25519",
  keys: [
    {
      keyId: "test-only-ephemeral-key",
      publicKeyPem,
      publicKeySha256: sha256(publicKeyPem),
      status: "ACTIVE",
    },
  ],
};
const prePath = path.join(
  process.cwd(),
  "docs/v2/curriculum/de/task6c-four-noun-review-attempts/task6c-four-noun-20261012-01/P.json",
);
const preSha256 = sha256(fs.readFileSync(prePath));
const closureRootSha256 = (pre as RecordValue).closureRootSha256 as string;

function signedReceipt(
  role: "NATIVE_GERMAN_REVIEW" | "ADVERSARIAL_REVIEW",
  runId: string,
  taskId: string,
  rawOutput: Buffer,
): RecordValue {
  const rawPath =
    role === "NATIVE_GERMAN_REVIEW"
      ? "review.native.raw"
      : "review.adversarial.raw";
  const payload = {
    schemaVersion: "learning-v2-runner-independent-review-receipt.v1",
    receiptKind: "RUNNER_ISSUED_INDEPENDENT_REVIEW_RECEIPT",
    attemptId: "task6c-four-noun-20261012-01",
    reviewRole: role,
    runnerInvocation: {
      runnerId: "external-independent-review-runner",
      runId,
      taskId,
      executionMode: "READ_ONLY",
      workspaceIsolation: "FRESH_ISOLATED_WORKSPACE",
    },
    bindings: {
      preManifestPath: "P.json",
      preManifestSha256: preSha256,
      closureRootSha256,
    },
    rawOutput: {
      path: rawPath,
      byteLength: rawOutput.byteLength,
      sha256: sha256(rawOutput),
    },
    verdict: "PASS",
    status: "HOLD_ONLY",
  };
  const payloadBytes = Buffer.from(canonicalJson(payload), "utf8");
  return {
    ...payload,
    signature: {
      algorithm: "ed25519",
      keyId: "test-only-ephemeral-key",
      signedPayloadSha256: sha256(payloadBytes),
      signatureBase64: sign(null, payloadBytes, privateKey).toString("base64"),
    },
  };
}

const nativeRaw = Buffer.from("native test-only raw output", "utf8");
const adversarialRaw = Buffer.from("adversarial test-only raw output", "utf8");
const nativeReceipt = signedReceipt(
  "NATIVE_GERMAN_REVIEW",
  "run-native-test-only",
  "task-native-test-only",
  nativeRaw,
);
const adversarialReceipt = signedReceipt(
  "ADVERSARIAL_REVIEW",
  "run-adversarial-test-only",
  "task-adversarial-test-only",
  adversarialRaw,
);

assert.doesNotThrow(() =>
  germanTask6cFourNounReviewAttemptTestHarnessDeV1.verifyReceiptForTest(
    nativeReceipt,
    "NATIVE_GERMAN_REVIEW",
    nativeRaw,
    trustRoot,
  ),
);
const reorderedNative = clone(nativeReceipt) as RecordValue;
const invocation = reorderedNative.runnerInvocation as RecordValue;
reorderedNative.runnerInvocation = Object.fromEntries(
  Object.entries(invocation).reverse(),
);
assert.doesNotThrow(() =>
  germanTask6cFourNounReviewAttemptTestHarnessDeV1.verifyReceiptForTest(
    reorderedNative,
    "NATIVE_GERMAN_REVIEW",
    nativeRaw,
    trustRoot,
  ),
);
assert.doesNotThrow(() =>
  germanTask6cFourNounReviewAttemptTestHarnessDeV1.verifyReceiptPairForTest(
    nativeReceipt,
    adversarialReceipt,
  ),
);
assert.throws(
  () =>
    germanTask6cFourNounReviewAttemptTestHarnessDeV1.verifyReceiptForTest(
      nativeReceipt,
      "NATIVE_GERMAN_REVIEW",
      Buffer.from("changed raw output", "utf8"),
      trustRoot,
    ),
  /RUNNER_RAW_OUTPUT_INVALID/u,
);

const repeatedTask = clone(adversarialReceipt) as RecordValue;
(repeatedTask.runnerInvocation as RecordValue).taskId = (
  nativeReceipt.runnerInvocation as RecordValue
).taskId;
assert.throws(
  () =>
    germanTask6cFourNounReviewAttemptTestHarnessDeV1.verifyReceiptPairForTest(
      nativeReceipt,
      repeatedTask,
    ),
  /RUNNER_RECEIPT_IDENTITY_REUSED/u,
);
const repeatedRun = clone(adversarialReceipt) as RecordValue;
(repeatedRun.runnerInvocation as RecordValue).runId = (
  nativeReceipt.runnerInvocation as RecordValue
).runId;
assert.throws(
  () =>
    germanTask6cFourNounReviewAttemptTestHarnessDeV1.verifyReceiptPairForTest(
      nativeReceipt,
      repeatedRun,
    ),
  /RUNNER_RECEIPT_IDENTITY_REUSED/u,
);

const badSignature = clone(nativeReceipt) as RecordValue;
(badSignature.signature as RecordValue).signatureBase64 = Buffer.from(
  "not-a-valid-signature",
  "utf8",
).toString("base64");
assert.throws(
  () =>
    germanTask6cFourNounReviewAttemptTestHarnessDeV1.verifyReceiptForTest(
      badSignature,
      "NATIVE_GERMAN_REVIEW",
      nativeRaw,
      trustRoot,
    ),
  /RUNNER_RECEIPT_SIGNATURE_INVALID/u,
);

const finalFixture = {
  schemaVersion: "learning-v2-de-task6c-four-noun-review-attempt-final.v1",
  attemptId: "task6c-four-noun-20261012-01",
  stage: "F",
  preManifestSha256: preSha256,
  closureRootSha256,
  receipts: {
    native: {
      path: "review.native.runner-receipt.json",
      sha256: sha256(`${JSON.stringify(nativeReceipt, null, 2)}\n`),
      rawOutputPath: "review.native.raw",
      rawOutputSha256: sha256(nativeRaw),
    },
    adversarial: {
      path: "review.adversarial.runner-receipt.json",
      sha256: sha256(`${JSON.stringify(adversarialReceipt, null, 2)}\n`),
      rawOutputPath: "review.adversarial.raw",
      rawOutputSha256: sha256(adversarialRaw),
    },
  },
  status: {
    attemptAcceptance: "RUNNER_RECEIPTS_VERIFIED_HOLD",
    status: "HOLD",
    canonicalAdmission: "FORBIDDEN",
    rowsPromoted: 0,
    task7Unlock: false,
    packetMaterializationAuthority: false,
    learnerFacing: false,
    learnerAuthoring: "HOLD",
    mockup: "HOLD",
    audio: "HOLD",
    runtime: "HOLD",
    release: "HOLD",
    englishAuthority: "EXCLUDED",
  },
};
assert.doesNotThrow(() =>
  germanTask6cFourNounReviewAttemptTestHarnessDeV1.validateFinalForTest(
    finalFixture,
    finalFixture.receipts.native.sha256,
    finalFixture.receipts.adversarial.sha256,
    finalFixture.receipts.native.rawOutputSha256,
    finalFixture.receipts.adversarial.rawOutputSha256,
  ),
);
const promotedFinal = clone(finalFixture) as RecordValue;
(promotedFinal.status as RecordValue).rowsPromoted = 4;
assert.throws(
  () =>
    germanTask6cFourNounReviewAttemptTestHarnessDeV1.validateFinalForTest(
      promotedFinal,
      finalFixture.receipts.native.sha256,
      finalFixture.receipts.adversarial.sha256,
      finalFixture.receipts.native.rawOutputSha256,
      finalFixture.receipts.adversarial.rawOutputSha256,
    ),
  /FOUR_NOUN_ATTEMPT_STATUS_INVALID/u,
);

assert.equal(runGermanTask6cFourNounReviewAttemptGateDeV1.length, 0);
assert.equal(
  germanTask6cFourNounReviewAttemptTestHarnessDeV1.firstMissingAuthorityForTest(
    {
      nativeReceipt: false,
      nativeRaw: false,
      adversarialReceipt: false,
      adversarialRaw: false,
      trustRoot: false,
      final: true,
    },
  ),
  "RUNNER_RECEIPT_MISSING:NATIVE_GERMAN_REVIEW",
);
assert.equal(
  germanTask6cFourNounReviewAttemptTestHarnessDeV1.firstMissingAuthorityForTest(
    {
      nativeReceipt: true,
      nativeRaw: true,
      adversarialReceipt: true,
      adversarialRaw: true,
      trustRoot: true,
      final: false,
    },
  ),
  null,
);
assert.throws(
  () => runGermanTask6cFourNounReviewAttemptGateDeV1(),
  /RUNNER_RECEIPT_MISSING:NATIVE_GERMAN_REVIEW/u,
);

const actualGate = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "scripts/learning-v2-de-task6c-four-noun-review-attempt-gate.ts",
  ],
  { cwd: process.cwd(), encoding: "utf8", shell: false, windowsHide: true },
);
assert.equal(actualGate.error, undefined);
assert.notEqual(actualGate.status, 0);
assert.match(
  `${actualGate.stdout}${actualGate.stderr}`,
  /RUNNER_RECEIPT_MISSING:NATIVE_GERMAN_REVIEW/u,
);

process.stdout.write(
  "TASK6C_FOUR_NOUN_REVIEW_ATTEMPT_PROTOCOL_STRUCTURE_VALID status=HOLD actualGate=RUNNER_RECEIPT_MISSING rowsPromoted=0 task7Unlock=false learnerFacing=false release=false\n",
);
