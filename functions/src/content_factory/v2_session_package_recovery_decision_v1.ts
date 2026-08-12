import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";

export const V2_SESSION_PACKAGE_MAX_BATCH = 4;
export const V2_SESSION_PACKAGE_SESSION_COUNT = 12;
export const V2_SESSION_PACKAGE_RECEIPT_MAX_BYTES = 16 * 1024;

export type V2RecoveryObjectState = "absent" | "exact" | "conflict";
export type V2RecoveryReceiptState = "absent" | "exact" | "conflict";
export type V2SessionPackageObjectKindV1 =
  | "source"
  | "render"
  | "capsule"
  | "sidecar";

export interface V2SessionPackageReceiptObjectPinV1 {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
}

export interface V2SessionPackageReceiptV1 {
  readonly schemaVersion: "v2-session-package-receipt.v1";
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly pairFingerprint: string;
  readonly packageRootFingerprint: string;
  readonly objectPins: Readonly<{
    source: V2SessionPackageReceiptObjectPinV1;
    render: V2SessionPackageReceiptObjectPinV1;
    capsule: V2SessionPackageReceiptObjectPinV1;
    sidecar: V2SessionPackageReceiptObjectPinV1;
  }>;
  readonly storageEvidence: "exact_immutable_object_pins";
  readonly executionAuthority: "none";
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

export type V2SessionPackageReceiptInputV1 = Omit<
  V2SessionPackageReceiptV1,
  | "schemaVersion"
  | "storageEvidence"
  | "executionAuthority"
  | "releaseAuthority"
  | "receiptFingerprint"
>;

export interface V2SessionPackageReceiptEvidenceV1 {
  readonly schemaVersion: "v2-session-package-receipt-evidence.v1";
  readonly state: V2RecoveryReceiptState;
  readonly sessionOrdinal: number;
  readonly expectedReceiptFingerprint: string;
  readonly observedReceiptFingerprint: string | null;
  readonly receipt: V2SessionPackageReceiptV1 | null;
}

export interface V2SessionPackageRecoveryStateV1 {
  readonly sessionOrdinal: number;
  readonly nextSessionOrdinal: number;
  readonly source: V2RecoveryObjectState;
  readonly render: V2RecoveryObjectState;
  readonly capsule: V2RecoveryObjectState;
  readonly sidecar: V2RecoveryObjectState;
  readonly receiptEvidence: V2SessionPackageReceiptEvidenceV1;
}

export type V2SessionPackageRecoveryDecisionV1 =
  | Readonly<{
      kind: "generate_source";
      sessionOrdinal: number;
      providerAllowed: true;
    }>
  | Readonly<{
      kind: "materialize_missing_children";
      sessionOrdinal: number;
      missing: readonly ("render" | "capsule" | "sidecar")[];
      providerAllowed: false;
    }>
  | Readonly<{
      kind: "create_receipt_and_advance" | "repair_cursor_from_receipt";
      sessionOrdinal: number;
      nextSessionOrdinal: number;
      providerAllowed: false;
    }>
  | Readonly<{
      kind: "exact_replay";
      sessionOrdinal: number;
      nextSessionOrdinal: number;
      providerAllowed: false;
    }>;

const HASH_RE = /^[a-f0-9]{64}$/;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const OBJECT_PATH_RE = /^[A-Za-z0-9._/-]{1,300}$/;
const RECEIPT_KEYS = [
  "schemaVersion",
  "sessionOrdinal",
  "sessionId",
  "pairFingerprint",
  "packageRootFingerprint",
  "objectPins",
  "storageEvidence",
  "executionAuthority",
  "releaseAuthority",
  "receiptFingerprint",
] as const;
const RECEIPT_INPUT_KEYS = [
  "sessionOrdinal",
  "sessionId",
  "pairFingerprint",
  "packageRootFingerprint",
  "objectPins",
] as const;
const OBJECT_PINS_KEYS = ["source", "render", "capsule", "sidecar"] as const;
const PIN_KEYS = [
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
] as const;
const PIN_MAX_BYTES: Readonly<Record<V2SessionPackageObjectKindV1, number>> =
  Object.freeze({
    source: 512 * 1024,
    render: 256 * 1024,
    capsule: 64 * 1024,
    sidecar: 128 * 1024,
  });
const receiptHandles = new WeakSet<object>();
const evidenceHandles = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: unknown,
  expected: readonly string[],
  code: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail(code);
  const actual = Object.keys(value).sort();
  const sortedExpected = Array.from(expected).sort();
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    fail(code);
  }
}

function exactOrdinal(
  value: unknown,
  min: number,
  max: number,
  code: string,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < min ||
    Number(value) > max
  )
    fail(code);
  return Number(value);
}

function exactHash(value: unknown, code: string): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail(code);
  return value;
}

function exactPin(
  value: unknown,
  kind: V2SessionPackageObjectKindV1,
): V2SessionPackageReceiptObjectPinV1 {
  const code = "v2_session_recovery_receipt_pin_invalid";
  exactKeys(value, PIN_KEYS, code);
  if (
    typeof value.objectPath !== "string" ||
    !OBJECT_PATH_RE.test(value.objectPath) ||
    value.objectPath.startsWith("/") ||
    value.objectPath.includes("..") ||
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > PIN_MAX_BYTES[kind]
  ) {
    fail(code);
  }
  const contentHash = exactHash(value.contentHash, code);
  const expectedSuffix =
    kind === "source" ? "/source.json" : `/${kind}/${contentHash}.json`;
  if (!value.objectPath.endsWith(expectedSuffix)) fail(code);
  return Object.freeze({
    objectPath: value.objectPath,
    contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
  });
}

function receiptBody(input: V2SessionPackageReceiptInputV1) {
  return Object.freeze({
    schemaVersion: "v2-session-package-receipt.v1" as const,
    sessionOrdinal: input.sessionOrdinal,
    sessionId: input.sessionId,
    pairFingerprint: input.pairFingerprint,
    packageRootFingerprint: input.packageRootFingerprint,
    objectPins: input.objectPins,
    storageEvidence: "exact_immutable_object_pins" as const,
    executionAuthority: "none" as const,
    releaseAuthority: false as const,
  });
}

export function materializeV2SessionPackageReceiptV1(
  input: V2SessionPackageReceiptInputV1,
): V2SessionPackageReceiptV1 {
  const code = "v2_session_recovery_receipt_invalid";
  exactKeys(input, RECEIPT_INPUT_KEYS, code);
  const sessionOrdinal = exactOrdinal(input.sessionOrdinal, 1, 12, code);
  const sessionSuffix = `:session:${String(sessionOrdinal).padStart(2, "0")}`;
  if (
    typeof input.sessionId !== "string" ||
    !ID_RE.test(input.sessionId) ||
    !input.sessionId.endsWith(sessionSuffix)
  ) {
    fail(code);
  }
  const pairFingerprint = exactHash(input.pairFingerprint, code);
  const packageRootFingerprint = exactHash(input.packageRootFingerprint, code);
  exactKeys(input.objectPins, OBJECT_PINS_KEYS, code);
  const source = exactPin(input.objectPins.source, "source");
  const render = exactPin(input.objectPins.render, "render");
  const capsule = exactPin(input.objectPins.capsule, "capsule");
  const sidecar = exactPin(input.objectPins.sidecar, "sidecar");
  const paths = [
    source.objectPath,
    render.objectPath,
    capsule.objectPath,
    sidecar.objectPath,
  ];
  if (new Set(paths).size !== paths.length) {
    fail("v2_session_recovery_receipt_pin_invalid");
  }
  const normalizedInput: V2SessionPackageReceiptInputV1 = Object.freeze({
    sessionOrdinal,
    sessionId: input.sessionId,
    pairFingerprint,
    packageRootFingerprint,
    objectPins: Object.freeze({ source, render, capsule, sidecar }),
  });
  const body = receiptBody(normalizedInput);
  const receipt = Object.freeze({
    ...body,
    receiptFingerprint: hashCanonicalBody({
      schemaVersion: "v2-session-package-receipt-fingerprint.v1",
      receipt: body,
    }),
  });
  receiptHandles.add(receipt);
  return receipt;
}

export function parseV2SessionPackageReceiptV1(
  raw: string,
): V2SessionPackageReceiptV1 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_SESSION_PACKAGE_RECEIPT_MAX_BYTES ||
    utf8ByteLengthV1(raw) > V2_SESSION_PACKAGE_RECEIPT_MAX_BYTES
  ) {
    fail("v2_session_recovery_receipt_too_large");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw) as unknown;
  } catch {
    fail("v2_session_recovery_receipt_json_invalid");
  }
  exactKeys(decoded, RECEIPT_KEYS, "v2_session_recovery_receipt_invalid");
  if (
    decoded.schemaVersion !== "v2-session-package-receipt.v1" ||
    decoded.storageEvidence !== "exact_immutable_object_pins" ||
    decoded.executionAuthority !== "none" ||
    decoded.releaseAuthority !== false
  ) {
    fail("v2_session_recovery_receipt_invalid");
  }
  const rebuilt = materializeV2SessionPackageReceiptV1({
    sessionOrdinal: decoded.sessionOrdinal as number,
    sessionId: decoded.sessionId as string,
    pairFingerprint: decoded.pairFingerprint as string,
    packageRootFingerprint: decoded.packageRootFingerprint as string,
    objectPins:
      decoded.objectPins as V2SessionPackageReceiptInputV1["objectPins"],
  });
  if (
    decoded.receiptFingerprint !== rebuilt.receiptFingerprint ||
    canonicalJsonV1(rebuilt) !== raw
  ) {
    fail("v2_session_recovery_receipt_invalid");
  }
  return rebuilt;
}

export function isV2SessionPackageReceiptV1(
  value: unknown,
): value is V2SessionPackageReceiptV1 {
  return (
    typeof value === "object" &&
    value !== null &&
    receiptHandles.has(value as object)
  );
}

function brandedEvidence(
  state: V2RecoveryReceiptState,
  expected: V2SessionPackageReceiptV1,
  observed: V2SessionPackageReceiptV1 | null,
): V2SessionPackageReceiptEvidenceV1 {
  const evidence = Object.freeze({
    schemaVersion: "v2-session-package-receipt-evidence.v1" as const,
    state,
    sessionOrdinal: expected.sessionOrdinal,
    expectedReceiptFingerprint: expected.receiptFingerprint,
    observedReceiptFingerprint: observed?.receiptFingerprint ?? null,
    receipt: observed,
  });
  evidenceHandles.add(evidence);
  return evidence;
}

export function classifyV2SessionPackageReceiptEvidenceV1(
  expected: V2SessionPackageReceiptV1,
  observedRaw: string | null,
): V2SessionPackageReceiptEvidenceV1 {
  if (!isV2SessionPackageReceiptV1(expected)) {
    fail("v2_session_recovery_receipt_expectation_untrusted");
  }
  if (observedRaw === null) return brandedEvidence("absent", expected, null);
  if (typeof observedRaw !== "string") {
    fail("v2_session_recovery_receipt_classifier_input_invalid");
  }
  const observed = parseV2SessionPackageReceiptV1(observedRaw);
  const state =
    observed.receiptFingerprint === expected.receiptFingerprint &&
    canonicalJsonV1(observed) === canonicalJsonV1(expected)
      ? "exact"
      : "conflict";
  return brandedEvidence(state, expected, observed);
}

export function isV2SessionPackageReceiptEvidenceV1(
  value: unknown,
): value is V2SessionPackageReceiptEvidenceV1 {
  return (
    typeof value === "object" &&
    value !== null &&
    evidenceHandles.has(value as object)
  );
}

function exactState(value: unknown): value is V2RecoveryObjectState {
  return value === "absent" || value === "exact" || value === "conflict";
}

export function decideV2SessionPackageRecoveryV1(
  input: V2SessionPackageRecoveryStateV1,
): V2SessionPackageRecoveryDecisionV1 {
  if (!input || typeof input !== "object")
    fail("v2_session_recovery_state_invalid");
  const expectedKeys = [
    "sessionOrdinal",
    "nextSessionOrdinal",
    "source",
    "render",
    "capsule",
    "sidecar",
    "receiptEvidence",
  ];
  const actualKeys = Object.keys(input);
  if (
    actualKeys.length !== expectedKeys.length ||
    !expectedKeys.every((key) => actualKeys.includes(key))
  ) {
    fail("v2_session_recovery_state_invalid");
  }
  const sessionOrdinal = exactOrdinal(
    input.sessionOrdinal,
    1,
    12,
    "v2_session_recovery_state_invalid",
  );
  const nextSessionOrdinal = exactOrdinal(
    input.nextSessionOrdinal,
    1,
    13,
    "v2_session_recovery_state_invalid",
  );
  const states = [input.source, input.render, input.capsule, input.sidecar];
  if (
    states.some((state) => !exactState(state)) ||
    !isV2SessionPackageReceiptEvidenceV1(input.receiptEvidence) ||
    input.receiptEvidence.sessionOrdinal !== sessionOrdinal
  ) {
    fail("v2_session_recovery_state_invalid");
  }
  if (
    states.includes("conflict") ||
    input.receiptEvidence.state === "conflict"
  ) {
    fail("v2_session_recovery_immutable_conflict");
  }

  const children = [input.render, input.capsule, input.sidecar];
  const allObjectsExact =
    input.source === "exact" && children.every((state) => state === "exact");
  if (input.receiptEvidence.state === "exact") {
    if (!allObjectsExact) fail("v2_session_recovery_receipt_object_missing");
    if (nextSessionOrdinal < sessionOrdinal)
      fail("v2_session_recovery_checkpoint_gap");
    if (nextSessionOrdinal > sessionOrdinal + 1)
      fail("v2_session_recovery_cursor_jump");
    if (nextSessionOrdinal === sessionOrdinal) {
      return Object.freeze({
        kind: "repair_cursor_from_receipt" as const,
        sessionOrdinal,
        nextSessionOrdinal: sessionOrdinal + 1,
        providerAllowed: false as const,
      });
    }
    return Object.freeze({
      kind: "exact_replay" as const,
      sessionOrdinal,
      nextSessionOrdinal: sessionOrdinal + 1,
      providerAllowed: false as const,
    });
  }

  if (nextSessionOrdinal > sessionOrdinal)
    fail("v2_session_recovery_receipt_missing_after_advance");
  if (nextSessionOrdinal < sessionOrdinal)
    fail("v2_session_recovery_checkpoint_gap");
  if (input.source === "absent") {
    if (children.some((state) => state !== "absent"))
      fail("v2_session_recovery_child_without_source");
    return Object.freeze({
      kind: "generate_source" as const,
      sessionOrdinal,
      providerAllowed: true as const,
    });
  }
  const missing = Object.freeze(
    (["render", "capsule", "sidecar"] as const).filter(
      (key) => input[key] === "absent",
    ),
  );
  if (missing.length > 0) {
    return Object.freeze({
      kind: "materialize_missing_children" as const,
      sessionOrdinal,
      missing,
      providerAllowed: false as const,
    });
  }
  return Object.freeze({
    kind: "create_receipt_and_advance" as const,
    sessionOrdinal,
    nextSessionOrdinal: sessionOrdinal + 1,
    providerAllowed: false as const,
  });
}

export function nextV2SessionPackageBatchOrdinals(
  input: Readonly<{
    nextSessionOrdinal: number;
    maxItems?: number;
  }>,
): readonly number[] {
  const next = exactOrdinal(
    input.nextSessionOrdinal,
    1,
    13,
    "v2_session_recovery_cursor_invalid",
  );
  const maxItems = input.maxItems ?? V2_SESSION_PACKAGE_MAX_BATCH;
  if (
    !Number.isSafeInteger(maxItems) ||
    maxItems < 1 ||
    maxItems > V2_SESSION_PACKAGE_MAX_BATCH
  ) {
    fail("v2_session_recovery_batch_invalid");
  }
  if (next === 13) return Object.freeze([]);
  const count = Math.min(maxItems, V2_SESSION_PACKAGE_SESSION_COUNT - next + 1);
  return Object.freeze(
    Array.from({ length: count }, (_, index) => next + index),
  );
}
