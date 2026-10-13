import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type RecordValue = Record<string, unknown>;
type ReviewRole = "NATIVE_GERMAN_REVIEW" | "ADVERSARIAL_REVIEW";
type AuthorityPresence = Readonly<{
  nativeReceipt: boolean;
  nativeRaw: boolean;
  adversarialReceipt: boolean;
  adversarialRaw: boolean;
  trustRoot: boolean;
  final: boolean;
}>;

const ROOT = path.resolve(__dirname, "../../../..");
const ATTEMPT_ID = "task6c-four-noun-20261012-01";
const ATTEMPT_ROOT =
  "docs/v2/curriculum/de/task6c-four-noun-review-attempts/task6c-four-noun-20261012-01";
const PRE_PATH = `${ATTEMPT_ROOT}/P.json`;
const FINAL_PATH = `${ATTEMPT_ROOT}/F.json`;
const TRUST_ROOT_PATH =
  "docs/v2/curriculum/de/task6c-four-noun-review-attempts/runner-trust-root.json";
const CLOSURE_ALGORITHM = "sha256(json-v1; sorted-path-byte-digests)";
const CLOSURE_ROOT_SHA256 =
  "49f4c6681fd83d15f197a131a10df6b3b0039b4faf92ca3776abfa45e45110f0";

const CLOSURE_ENTRIES = Object.freeze([
  {
    path: "docs/v2/curriculum/de/task6c-full-registry-l01-v1/target-allocation.json",
    sha256: "b6ddd2e2fb665fe6c295a624c7009791539473ee23e9141b89b30cbfd507e0f0",
  },
  {
    path: "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/manifest.json",
    sha256: "a3a44ab4d1bc79ccc0af6741070eeb36267382fab2f44bb3dfb912adcdb42b55",
  },
  {
    path: "modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json",
    sha256: "95181fb58d7563fc1ae37f220ad13b2543ccde898dfe1e93922cecc4a082fd31",
  },
  {
    path: "modules/learning-v2/curriculum/de/registries/task6c_task5_allocation_admission_de_v1.json",
    sha256: "044bff82f93c06529595b0b1e41dd7ee61c81ee10bc4adebb084dcf096ec1ff3",
  },
  {
    path: "modules/learning-v2/curriculum/de/task6c_task5_allocation_admission_de_v1.ts",
    sha256: "1e867019e3cfbd804e2ec4bd1486dcbec904a568eaf3d9d9d546f53ec343cbff",
  },
  {
    path: "tests/learning_v2_de_task6c_task5_allocation_admission_gate.ts",
    sha256: "be7ac31870fae2898fc9e2dd1e954512ed6a9b07dd538603f92092c05848ecd5",
  },
] as const);

const REVIEW_FILES = Object.freeze({
  NATIVE_GERMAN_REVIEW: {
    receipt: "review.native.runner-receipt.json",
    raw: "review.native.raw",
  },
  ADVERSARIAL_REVIEW: {
    receipt: "review.adversarial.runner-receipt.json",
    raw: "review.adversarial.raw",
  },
} as const);

const PRE_KEYS = [
  "schemaVersion",
  "attemptId",
  "stage",
  "closureAlgorithm",
  "closureEntries",
  "closureRootSha256",
  "requiredReviews",
  "rejectedEvidenceKinds",
  "receiptContract",
  "status",
] as const;
const CLOSURE_ENTRY_KEYS = ["path", "sha256"] as const;
const REQUIRED_REVIEW_KEYS = [
  "reviewRole",
  "receiptPath",
  "rawOutputPath",
] as const;
const RECEIPT_CONTRACT_KEYS = [
  "schemaVersion",
  "receiptKind",
  "signatureAlgorithm",
  "runnerTrustRootPath",
  "requiredExecutionMode",
  "requiredWorkspaceIsolation",
] as const;
const STATUS_KEYS = [
  "attemptAcceptance",
  "status",
  "canonicalAdmission",
  "rowsPromoted",
  "task7Unlock",
  "packetMaterializationAuthority",
  "learnerFacing",
  "learnerAuthoring",
  "mockup",
  "audio",
  "runtime",
  "release",
  "englishAuthority",
] as const;
const RECEIPT_KEYS = [
  "schemaVersion",
  "receiptKind",
  "attemptId",
  "reviewRole",
  "runnerInvocation",
  "bindings",
  "rawOutput",
  "verdict",
  "status",
  "signature",
] as const;
const INVOCATION_KEYS = [
  "runnerId",
  "runId",
  "taskId",
  "executionMode",
  "workspaceIsolation",
] as const;
const BINDING_KEYS = [
  "preManifestPath",
  "preManifestSha256",
  "closureRootSha256",
] as const;
const RAW_OUTPUT_KEYS = ["path", "byteLength", "sha256"] as const;
const SIGNATURE_KEYS = [
  "algorithm",
  "keyId",
  "signedPayloadSha256",
  "signatureBase64",
] as const;
const TRUST_ROOT_KEYS = ["schemaVersion", "algorithm", "keys"] as const;
const TRUST_KEY_KEYS = [
  "keyId",
  "publicKeyPem",
  "publicKeySha256",
  "status",
] as const;
const FINAL_KEYS = [
  "schemaVersion",
  "attemptId",
  "stage",
  "preManifestSha256",
  "closureRootSha256",
  "receipts",
  "status",
] as const;
const FINAL_RECEIPTS_KEYS = ["native", "adversarial"] as const;
const FINAL_RECEIPT_KEYS = [
  "path",
  "sha256",
  "rawOutputPath",
  "rawOutputSha256",
] as const;

function fail(code: string): never {
  throw new Error(code);
}

function record(value: unknown, code: string): asserts value is RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
}

function exact(
  value: RecordValue,
  keys: readonly string[],
  code: string,
): void {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    fail(code);
}

function nonempty(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) fail(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

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

function fixedPath(relative: string): string {
  if (
    path.isAbsolute(relative) ||
    relative.includes("\\") ||
    relative.split("/").includes("..")
  )
    fail("FOUR_NOUN_FIXED_PATH_INVALID");
  const resolved = path.resolve(ROOT, ...relative.split("/"));
  if (!resolved.startsWith(`${ROOT}${path.sep}`))
    fail("FOUR_NOUN_FIXED_PATH_INVALID");
  return resolved;
}

function readCanonicalJson(file: string, code: string): unknown {
  let raw: string;
  let parsed: unknown;
  try {
    raw = fs.readFileSync(file, "utf8");
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return fail(code);
  }
  if (
    raw.charCodeAt(0) === 0xfeff ||
    !/(?:\r\n|\n)$/u.test(raw) ||
    /(?:\r\n|\n){2}$/u.test(raw) ||
    /\t/u.test(raw) ||
    /[ \t]+(?:\r\n|\n)/u.test(raw) ||
    /\r(?!\n)/u.test(raw)
  )
    fail(code);
  return parsed;
}

function expectedStatus(
  acceptance:
    | "PENDING_INDEPENDENT_RUNNER_RECEIPTS"
    | "RUNNER_RECEIPTS_VERIFIED_HOLD",
): RecordValue {
  return {
    attemptAcceptance: acceptance,
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
  };
}

function equalJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function verifyCurrentClosure(): void {
  for (const entry of CLOSURE_ENTRIES) {
    const actual = sha256(fs.readFileSync(fixedPath(entry.path)));
    if (actual !== entry.sha256)
      fail(`FOUR_NOUN_CLOSURE_HASH_MISMATCH:${entry.path}`);
  }
  if (sha256(JSON.stringify(CLOSURE_ENTRIES)) !== CLOSURE_ROOT_SHA256)
    fail("FOUR_NOUN_CLOSURE_ROOT_MISMATCH");
}

function validatePre(input: unknown): RecordValue {
  record(input, "FOUR_NOUN_PRE_SCHEMA_INVALID");
  exact(input, PRE_KEYS, "FOUR_NOUN_PRE_SCHEMA_INVALID");
  if (
    input.schemaVersion !==
      "learning-v2-de-task6c-four-noun-review-attempt-pre.v1" ||
    input.attemptId !== ATTEMPT_ID ||
    input.stage !== "P" ||
    input.closureAlgorithm !== CLOSURE_ALGORITHM
  )
    fail("FOUR_NOUN_PRE_IDENTITY_INVALID");
  if (
    !Array.isArray(input.closureEntries) ||
    !equalJson(input.closureEntries, CLOSURE_ENTRIES)
  )
    fail("FOUR_NOUN_CLOSURE_HASH_MISMATCH");
  input.closureEntries.forEach((entry) => {
    record(entry, "FOUR_NOUN_CLOSURE_SCHEMA_INVALID");
    exact(entry, CLOSURE_ENTRY_KEYS, "FOUR_NOUN_CLOSURE_SCHEMA_INVALID");
  });
  const calculatedRoot = sha256(JSON.stringify(input.closureEntries));
  if (
    input.closureRootSha256 !== CLOSURE_ROOT_SHA256 ||
    calculatedRoot !== CLOSURE_ROOT_SHA256
  )
    fail("FOUR_NOUN_CLOSURE_ROOT_MISMATCH");
  const expectedReviews = [
    {
      reviewRole: "NATIVE_GERMAN_REVIEW",
      receiptPath: REVIEW_FILES.NATIVE_GERMAN_REVIEW.receipt,
      rawOutputPath: REVIEW_FILES.NATIVE_GERMAN_REVIEW.raw,
    },
    {
      reviewRole: "ADVERSARIAL_REVIEW",
      receiptPath: REVIEW_FILES.ADVERSARIAL_REVIEW.receipt,
      rawOutputPath: REVIEW_FILES.ADVERSARIAL_REVIEW.raw,
    },
  ];
  if (
    !Array.isArray(input.requiredReviews) ||
    !equalJson(input.requiredReviews, expectedReviews)
  )
    fail("FOUR_NOUN_REQUIRED_REVIEWS_INVALID");
  input.requiredReviews.forEach((review) => {
    record(review, "FOUR_NOUN_REQUIRED_REVIEWS_INVALID");
    exact(review, REQUIRED_REVIEW_KEYS, "FOUR_NOUN_REQUIRED_REVIEWS_INVALID");
  });
  if (
    !equalJson(input.rejectedEvidenceKinds, [
      "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY",
    ])
  )
    fail("FOUR_NOUN_REJECTED_EVIDENCE_INVALID");
  record(input.receiptContract, "FOUR_NOUN_RECEIPT_CONTRACT_INVALID");
  exact(
    input.receiptContract,
    RECEIPT_CONTRACT_KEYS,
    "FOUR_NOUN_RECEIPT_CONTRACT_INVALID",
  );
  if (
    !equalJson(input.receiptContract, {
      schemaVersion: "learning-v2-runner-independent-review-receipt.v1",
      receiptKind: "RUNNER_ISSUED_INDEPENDENT_REVIEW_RECEIPT",
      signatureAlgorithm: "ed25519",
      runnerTrustRootPath: TRUST_ROOT_PATH,
      requiredExecutionMode: "READ_ONLY",
      requiredWorkspaceIsolation: "FRESH_ISOLATED_WORKSPACE",
    })
  )
    fail("FOUR_NOUN_RECEIPT_CONTRACT_INVALID");
  record(input.status, "FOUR_NOUN_ATTEMPT_STATUS_INVALID");
  exact(input.status, STATUS_KEYS, "FOUR_NOUN_ATTEMPT_STATUS_INVALID");
  if (
    !equalJson(
      input.status,
      expectedStatus("PENDING_INDEPENDENT_RUNNER_RECEIPTS"),
    )
  )
    fail("FOUR_NOUN_ATTEMPT_STATUS_INVALID");
  verifyCurrentClosure();
  return input;
}

function receiptUnsignedPayload(input: RecordValue): RecordValue {
  return {
    schemaVersion: input.schemaVersion,
    receiptKind: input.receiptKind,
    attemptId: input.attemptId,
    reviewRole: input.reviewRole,
    runnerInvocation: input.runnerInvocation,
    bindings: input.bindings,
    rawOutput: input.rawOutput,
    verdict: input.verdict,
    status: input.status,
  };
}

function validateTrustRoot(input: unknown): RecordValue {
  record(input, "RUNNER_TRUST_ROOT_INVALID");
  exact(input, TRUST_ROOT_KEYS, "RUNNER_TRUST_ROOT_INVALID");
  if (
    input.schemaVersion !== "learning-v2-runner-trust-root.v1" ||
    input.algorithm !== "ed25519" ||
    !Array.isArray(input.keys) ||
    input.keys.length === 0
  )
    fail("RUNNER_TRUST_ROOT_INVALID");
  const ids = new Set<string>();
  input.keys.forEach((key) => {
    record(key, "RUNNER_TRUST_ROOT_INVALID");
    exact(key, TRUST_KEY_KEYS, "RUNNER_TRUST_ROOT_INVALID");
    nonempty(key.keyId, "RUNNER_TRUST_ROOT_INVALID");
    nonempty(key.publicKeyPem, "RUNNER_TRUST_ROOT_INVALID");
    nonempty(key.publicKeySha256, "RUNNER_TRUST_ROOT_INVALID");
    if (
      key.status !== "ACTIVE" ||
      sha256(key.publicKeyPem) !== key.publicKeySha256 ||
      ids.has(key.keyId)
    )
      fail("RUNNER_TRUST_ROOT_INVALID");
    ids.add(key.keyId);
  });
  return input;
}

function verifyReceipt(
  input: unknown,
  role: ReviewRole,
  rawOutput: Buffer,
  trustRootInput: unknown,
): RecordValue {
  record(input, "RUNNER_RECEIPT_SCHEMA_INVALID");
  if (
    input.recordKind === "ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY" ||
    input.receiptKind !== "RUNNER_ISSUED_INDEPENDENT_REVIEW_RECEIPT"
  )
    fail("RUNNER_RECEIPT_KIND_INVALID");
  exact(input, RECEIPT_KEYS, "RUNNER_RECEIPT_SCHEMA_INVALID");
  if (
    input.schemaVersion !==
      "learning-v2-runner-independent-review-receipt.v1" ||
    input.attemptId !== ATTEMPT_ID ||
    input.reviewRole !== role
  )
    fail("RUNNER_RECEIPT_IDENTITY_INVALID");
  record(input.runnerInvocation, "RUNNER_INVOCATION_INVALID");
  exact(input.runnerInvocation, INVOCATION_KEYS, "RUNNER_INVOCATION_INVALID");
  for (const key of ["runnerId", "runId", "taskId"] as const)
    nonempty(input.runnerInvocation[key], "RUNNER_INVOCATION_INVALID");
  if (
    input.runnerInvocation.executionMode !== "READ_ONLY" ||
    input.runnerInvocation.workspaceIsolation !== "FRESH_ISOLATED_WORKSPACE"
  )
    fail("RUNNER_INVOCATION_NOT_INDEPENDENT");
  record(input.bindings, "RUNNER_RECEIPT_BINDING_INVALID");
  exact(input.bindings, BINDING_KEYS, "RUNNER_RECEIPT_BINDING_INVALID");
  const preSha256 = sha256(fs.readFileSync(fixedPath(PRE_PATH)));
  if (
    input.bindings.preManifestPath !== "P.json" ||
    input.bindings.preManifestSha256 !== preSha256 ||
    input.bindings.closureRootSha256 !== CLOSURE_ROOT_SHA256
  )
    fail("RUNNER_RECEIPT_BINDING_INVALID");
  record(input.rawOutput, "RUNNER_RAW_OUTPUT_INVALID");
  exact(input.rawOutput, RAW_OUTPUT_KEYS, "RUNNER_RAW_OUTPUT_INVALID");
  if (
    input.rawOutput.path !== REVIEW_FILES[role].raw ||
    input.rawOutput.byteLength !== rawOutput.byteLength ||
    input.rawOutput.sha256 !== sha256(rawOutput)
  )
    fail("RUNNER_RAW_OUTPUT_INVALID");
  if (input.verdict !== "PASS" || input.status !== "HOLD_ONLY")
    fail("RUNNER_REVIEW_VERDICT_NOT_PASS");
  record(input.signature, "RUNNER_RECEIPT_SIGNATURE_INVALID");
  exact(input.signature, SIGNATURE_KEYS, "RUNNER_RECEIPT_SIGNATURE_INVALID");
  if (input.signature.algorithm !== "ed25519")
    fail("RUNNER_RECEIPT_SIGNATURE_INVALID");
  nonempty(input.signature.keyId, "RUNNER_RECEIPT_SIGNATURE_INVALID");
  nonempty(
    input.signature.signedPayloadSha256,
    "RUNNER_RECEIPT_SIGNATURE_INVALID",
  );
  nonempty(input.signature.signatureBase64, "RUNNER_RECEIPT_SIGNATURE_INVALID");
  const signatureKeyId = input.signature.keyId;
  const trustRoot = validateTrustRoot(trustRootInput);
  const trustKey = (trustRoot.keys as RecordValue[]).find(
    (key) => key.keyId === signatureKeyId,
  );
  if (trustKey === undefined) fail("RUNNER_RECEIPT_KEY_NOT_TRUSTED");
  const payloadBytes = Buffer.from(
    canonicalJson(receiptUnsignedPayload(input)),
    "utf8",
  );
  if (sha256(payloadBytes) !== input.signature.signedPayloadSha256)
    fail("RUNNER_RECEIPT_SIGNATURE_INVALID");
  let verified = false;
  try {
    verified = verifySignature(
      null,
      payloadBytes,
      createPublicKey(String(trustKey.publicKeyPem)),
      Buffer.from(input.signature.signatureBase64, "base64"),
    );
  } catch {
    verified = false;
  }
  if (!verified) fail("RUNNER_RECEIPT_SIGNATURE_INVALID");
  return input;
}

function verifyReceiptPair(native: unknown, adversarial: unknown): void {
  record(native, "RUNNER_RECEIPT_PAIR_INVALID");
  record(adversarial, "RUNNER_RECEIPT_PAIR_INVALID");
  if (
    native.reviewRole !== "NATIVE_GERMAN_REVIEW" ||
    adversarial.reviewRole !== "ADVERSARIAL_REVIEW"
  )
    fail("RUNNER_RECEIPT_PAIR_INVALID");
  record(native.runnerInvocation, "RUNNER_RECEIPT_PAIR_INVALID");
  record(adversarial.runnerInvocation, "RUNNER_RECEIPT_PAIR_INVALID");
  if (
    native.runnerInvocation.runId === adversarial.runnerInvocation.runId ||
    native.runnerInvocation.taskId === adversarial.runnerInvocation.taskId
  )
    fail("RUNNER_RECEIPT_IDENTITY_REUSED");
  record(native.bindings, "RUNNER_RECEIPT_PAIR_INVALID");
  record(adversarial.bindings, "RUNNER_RECEIPT_PAIR_INVALID");
  if (!equalJson(native.bindings, adversarial.bindings))
    fail("RUNNER_RECEIPT_PAIR_BINDING_MISMATCH");
  record(native.rawOutput, "RUNNER_RECEIPT_PAIR_INVALID");
  record(adversarial.rawOutput, "RUNNER_RECEIPT_PAIR_INVALID");
  if (native.rawOutput.path === adversarial.rawOutput.path)
    fail("RUNNER_RECEIPT_RAW_OUTPUT_REUSED");
}

function validateFinal(
  input: unknown,
  nativeReceiptSha256: string,
  adversarialReceiptSha256: string,
  nativeRawSha256: string,
  adversarialRawSha256: string,
): void {
  record(input, "FOUR_NOUN_FINAL_SCHEMA_INVALID");
  exact(input, FINAL_KEYS, "FOUR_NOUN_FINAL_SCHEMA_INVALID");
  if (
    input.schemaVersion !==
      "learning-v2-de-task6c-four-noun-review-attempt-final.v1" ||
    input.attemptId !== ATTEMPT_ID ||
    input.stage !== "F" ||
    input.preManifestSha256 !== sha256(fs.readFileSync(fixedPath(PRE_PATH))) ||
    input.closureRootSha256 !== CLOSURE_ROOT_SHA256
  )
    fail("FOUR_NOUN_FINAL_BINDING_INVALID");
  record(input.receipts, "FOUR_NOUN_FINAL_RECEIPTS_INVALID");
  exact(
    input.receipts,
    FINAL_RECEIPTS_KEYS,
    "FOUR_NOUN_FINAL_RECEIPTS_INVALID",
  );
  const expected = {
    native: {
      path: REVIEW_FILES.NATIVE_GERMAN_REVIEW.receipt,
      sha256: nativeReceiptSha256,
      rawOutputPath: REVIEW_FILES.NATIVE_GERMAN_REVIEW.raw,
      rawOutputSha256: nativeRawSha256,
    },
    adversarial: {
      path: REVIEW_FILES.ADVERSARIAL_REVIEW.receipt,
      sha256: adversarialReceiptSha256,
      rawOutputPath: REVIEW_FILES.ADVERSARIAL_REVIEW.raw,
      rawOutputSha256: adversarialRawSha256,
    },
  };
  for (const name of ["native", "adversarial"] as const) {
    record(input.receipts[name], "FOUR_NOUN_FINAL_RECEIPTS_INVALID");
    exact(
      input.receipts[name],
      FINAL_RECEIPT_KEYS,
      "FOUR_NOUN_FINAL_RECEIPTS_INVALID",
    );
  }
  if (!equalJson(input.receipts, expected))
    fail("FOUR_NOUN_FINAL_RECEIPTS_INVALID");
  record(input.status, "FOUR_NOUN_ATTEMPT_STATUS_INVALID");
  exact(input.status, STATUS_KEYS, "FOUR_NOUN_ATTEMPT_STATUS_INVALID");
  if (!equalJson(input.status, expectedStatus("RUNNER_RECEIPTS_VERIFIED_HOLD")))
    fail("FOUR_NOUN_ATTEMPT_STATUS_INVALID");
}

function readRoleBytes(role: ReviewRole): {
  receipt: RecordValue;
  receiptSha256: string;
  raw: Buffer;
  rawSha256: string;
} {
  const receiptPath = fixedPath(
    `${ATTEMPT_ROOT}/${REVIEW_FILES[role].receipt}`,
  );
  if (!fs.existsSync(receiptPath)) fail(`RUNNER_RECEIPT_MISSING:${role}`);
  const rawPath = fixedPath(`${ATTEMPT_ROOT}/${REVIEW_FILES[role].raw}`);
  if (!fs.existsSync(rawPath)) fail(`RUNNER_RAW_OUTPUT_MISSING:${role}`);
  const receipt = readCanonicalJson(
    receiptPath,
    `RUNNER_RECEIPT_SCHEMA_INVALID:${role}`,
  );
  record(receipt, `RUNNER_RECEIPT_SCHEMA_INVALID:${role}`);
  const raw = fs.readFileSync(rawPath);
  return {
    receipt,
    receiptSha256: sha256(fs.readFileSync(receiptPath)),
    raw,
    rawSha256: sha256(raw),
  };
}

function firstMissingAuthority(presence: AuthorityPresence): string | null {
  if (!presence.nativeReceipt)
    return "RUNNER_RECEIPT_MISSING:NATIVE_GERMAN_REVIEW";
  if (!presence.nativeRaw)
    return "RUNNER_RAW_OUTPUT_MISSING:NATIVE_GERMAN_REVIEW";
  if (!presence.adversarialReceipt)
    return "RUNNER_RECEIPT_MISSING:ADVERSARIAL_REVIEW";
  if (!presence.adversarialRaw)
    return "RUNNER_RAW_OUTPUT_MISSING:ADVERSARIAL_REVIEW";
  if (!presence.trustRoot) return "RUNNER_TRUST_ROOT_MISSING";
  return null;
}

/**
 * Fixed German-only gate. It cannot select evidence paths and never mutates,
 * admits, materializes, authors, or releases anything.
 */
export function runGermanTask6cFourNounReviewAttemptGateDeV1(): Readonly<{
  status: "HOLD";
  rowsPromoted: 0;
  task7Unlock: false;
  learnerFacing: false;
  release: "HOLD";
}> {
  const pre = readCanonicalJson(
    fixedPath(PRE_PATH),
    "FOUR_NOUN_PRE_SCHEMA_INVALID",
  );
  validatePre(pre);
  const missing = firstMissingAuthority({
    nativeReceipt: fs.existsSync(
      fixedPath(`${ATTEMPT_ROOT}/${REVIEW_FILES.NATIVE_GERMAN_REVIEW.receipt}`),
    ),
    nativeRaw: fs.existsSync(
      fixedPath(`${ATTEMPT_ROOT}/${REVIEW_FILES.NATIVE_GERMAN_REVIEW.raw}`),
    ),
    adversarialReceipt: fs.existsSync(
      fixedPath(`${ATTEMPT_ROOT}/${REVIEW_FILES.ADVERSARIAL_REVIEW.receipt}`),
    ),
    adversarialRaw: fs.existsSync(
      fixedPath(`${ATTEMPT_ROOT}/${REVIEW_FILES.ADVERSARIAL_REVIEW.raw}`),
    ),
    trustRoot: fs.existsSync(fixedPath(TRUST_ROOT_PATH)),
    final: fs.existsSync(fixedPath(FINAL_PATH)),
  });
  if (missing !== null) fail(missing);
  const native = readRoleBytes("NATIVE_GERMAN_REVIEW");
  const adversarial = readRoleBytes("ADVERSARIAL_REVIEW");
  const trustPath = fixedPath(TRUST_ROOT_PATH);
  const trustRoot = readCanonicalJson(trustPath, "RUNNER_TRUST_ROOT_INVALID");
  verifyReceipt(native.receipt, "NATIVE_GERMAN_REVIEW", native.raw, trustRoot);
  verifyReceipt(
    adversarial.receipt,
    "ADVERSARIAL_REVIEW",
    adversarial.raw,
    trustRoot,
  );
  verifyReceiptPair(native.receipt, adversarial.receipt);
  if (!fs.existsSync(fixedPath(FINAL_PATH))) fail("FOUR_NOUN_FINAL_MISSING");
  const final = readCanonicalJson(
    fixedPath(FINAL_PATH),
    "FOUR_NOUN_FINAL_SCHEMA_INVALID",
  );
  validateFinal(
    final,
    native.receiptSha256,
    adversarial.receiptSha256,
    native.rawSha256,
    adversarial.rawSha256,
  );
  return Object.freeze({
    status: "HOLD" as const,
    rowsPromoted: 0 as const,
    task7Unlock: false as const,
    learnerFacing: false as const,
    release: "HOLD" as const,
  });
}

export const germanTask6cFourNounReviewAttemptTestHarnessDeV1 = Object.freeze({
  readFixedPreForTest(): unknown {
    return readCanonicalJson(
      fixedPath(PRE_PATH),
      "FOUR_NOUN_PRE_SCHEMA_INVALID",
    );
  },
  validatePreForTest(input: unknown): void {
    validatePre(input);
  },
  verifyReceiptForTest(
    input: unknown,
    role: ReviewRole,
    rawOutput: Buffer,
    trustRoot: unknown,
  ): void {
    verifyReceipt(input, role, rawOutput, trustRoot);
  },
  verifyReceiptPairForTest(native: unknown, adversarial: unknown): void {
    verifyReceiptPair(native, adversarial);
  },
  validateFinalForTest(
    input: unknown,
    nativeReceiptSha256: string,
    adversarialReceiptSha256: string,
    nativeRawSha256: string,
    adversarialRawSha256: string,
  ): void {
    validateFinal(
      input,
      nativeReceiptSha256,
      adversarialReceiptSha256,
      nativeRawSha256,
      adversarialRawSha256,
    );
  },
  firstMissingAuthorityForTest(presence: AuthorityPresence): string | null {
    return firstMissingAuthority(presence);
  },
});
