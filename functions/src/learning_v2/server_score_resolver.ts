import type { CanonicalAttemptRef } from "../../../modules/learning-v2/contracts/attempt";
import type { V2ActivityResultCode } from "../../../modules/learning-v2/contracts/activity_result";
import type { VersionedPolicyRef } from "../../../modules/learning-v2/contracts/activity";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

/**
 * A score produced by the Functions-side policy evaluator.  This is the only
 * input that may later be converted into an earned-star projection.  A client
 * candidate (including the same numeric shape) is deliberately not accepted
 * by this contract.
 */
export interface ServerScoreResolverInput {
  readonly attemptRef: CanonicalAttemptRef;
  readonly activityId: string;
  readonly starSlotId: string;
  readonly progressCompatibilityKey: string;
  readonly scoringPolicyRef: VersionedPolicyRef<"scoring">;
  readonly resultCode: V2ActivityResultCode;
  readonly evidenceComponentFingerprint: string;
}

export interface ServerScoreResolution {
  readonly schemaVersion: "v2-server-score-resolution.v1";
  readonly source: "server_policy";
  readonly attemptRef: CanonicalAttemptRef;
  readonly activityId: string;
  readonly starSlotId: string;
  readonly progressCompatibilityKey: string;
  readonly scoringPolicyRef: VersionedPolicyRef<"scoring">;
  readonly resultCode: V2ActivityResultCode;
  readonly candidatePerformanceStars: 0 | 1 | 2 | 3;
  readonly evidenceComponentFingerprint: string;
  readonly decisionHash: string;
}

export type ServerScoreEvaluator = (
  input: Readonly<ServerScoreResolverInput>,
) => 0 | 1 | 2 | 3;

const RESULT_CODES: readonly V2ActivityResultCode[] = [
  "PASS_CONFIDENT",
  "NEEDS_WORK_CONFIDENT",
  "UNCERTAIN",
  "INVALID_AUDIO_OR_SYSTEM",
  "CORRECT",
  "WRONG",
  "COMPLETED",
  "SKIPPED",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const isSafeId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(value);
const isHash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isAttemptRef = (value: unknown): value is CanonicalAttemptRef =>
  isRecord(value) &&
  exactKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
  value.schemaVersion === "v2-attempt-ref.v1" &&
  isSafeId(value.opId) &&
  isHash(value.attemptBodyHash);
const isPolicyRef = (value: unknown): value is VersionedPolicyRef<"scoring"> =>
  isRecord(value) &&
  exactKeys(value, ["kind", "key", "version", "contentHash"]) &&
  value.kind === "scoring" &&
  isSafeId(value.key) &&
  Number.isSafeInteger(value.version) &&
  Number(value.version) >= 1 &&
  isHash(value.contentHash);
const isResultCode = (value: unknown): value is V2ActivityResultCode =>
  typeof value === "string" && RESULT_CODES.includes(value as V2ActivityResultCode);
const isStars = (value: unknown): value is 0 | 1 | 2 | 3 =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;

const scoreBody = (resolution: Omit<ServerScoreResolution, "decisionHash">): Omit<ServerScoreResolution, "decisionHash"> => resolution;

const assertInput = (input: ServerScoreResolverInput): void => {
  if (!isAttemptRef(input.attemptRef)) throw new Error("v2_server_score_attempt_ref_invalid");
  if (!isSafeId(input.activityId) || !isSafeId(input.starSlotId) || !input.progressCompatibilityKey.trim()) {
    throw new Error("v2_server_score_identity_invalid");
  }
  if (!isPolicyRef(input.scoringPolicyRef)) throw new Error("v2_server_score_policy_ref_invalid");
  if (!isResultCode(input.resultCode)) throw new Error("v2_server_score_result_invalid");
  if (!isHash(input.evidenceComponentFingerprint)) throw new Error("v2_server_score_evidence_fingerprint_invalid");
};

/**
 * Resolve a score inside trusted Functions code.  The evaluator is intentionally
 * injected: policy lookup/evaluation is a later integration seam, while this
 * contract already prevents a client projection from being treated as a score.
 */
export const resolveServerScore = (
  input: ServerScoreResolverInput,
  evaluate: ServerScoreEvaluator,
): ServerScoreResolution => {
  assertInput(input);
  const candidatePerformanceStars = evaluate(Object.freeze({ ...input }));
  if (!isStars(candidatePerformanceStars)) throw new Error("v2_server_score_output_invalid");
  if ((input.resultCode === "UNCERTAIN" || input.resultCode === "INVALID_AUDIO_OR_SYSTEM" || input.resultCode === "SKIPPED") && candidatePerformanceStars !== 0) {
    throw new Error("v2_server_score_result_must_be_zero");
  }
  const body = scoreBody({
    schemaVersion: "v2-server-score-resolution.v1",
    source: "server_policy",
    attemptRef: input.attemptRef,
    activityId: input.activityId,
    starSlotId: input.starSlotId,
    progressCompatibilityKey: input.progressCompatibilityKey,
    scoringPolicyRef: input.scoringPolicyRef,
    resultCode: input.resultCode,
    candidatePerformanceStars,
    evidenceComponentFingerprint: input.evidenceComponentFingerprint,
  });
  return Object.freeze({ ...body, decisionHash: hashCanonicalBody(body) });
};

export function assertServerScoreResolution(
  value: unknown,
  expected?: Pick<ServerScoreResolverInput, "attemptRef" | "activityId" | "starSlotId" | "progressCompatibilityKey" | "scoringPolicyRef" | "evidenceComponentFingerprint">,
): asserts value is ServerScoreResolution {
  if (!isRecord(value) || !exactKeys(value, ["schemaVersion", "source", "attemptRef", "activityId", "starSlotId", "progressCompatibilityKey", "scoringPolicyRef", "resultCode", "candidatePerformanceStars", "evidenceComponentFingerprint", "decisionHash"]) || value.schemaVersion !== "v2-server-score-resolution.v1" || value.source !== "server_policy" || !isAttemptRef(value.attemptRef) || !isSafeId(value.activityId) || !isSafeId(value.starSlotId) || typeof value.progressCompatibilityKey !== "string" || !value.progressCompatibilityKey.trim() || !isPolicyRef(value.scoringPolicyRef) || !isResultCode(value.resultCode) || !isStars(value.candidatePerformanceStars) || !isHash(value.evidenceComponentFingerprint) || !isHash(value.decisionHash)) {
    throw new Error("v2_server_score_resolution_invalid");
  }
  if ((value.resultCode === "UNCERTAIN" || value.resultCode === "INVALID_AUDIO_OR_SYSTEM" || value.resultCode === "SKIPPED") && value.candidatePerformanceStars !== 0) throw new Error("v2_server_score_result_must_be_zero");
  const body = { ...value } as Omit<ServerScoreResolution, "decisionHash">;
  delete (body as { decisionHash?: unknown }).decisionHash;
  if (hashCanonicalBody(body) !== value.decisionHash) throw new Error("v2_server_score_hash_mismatch");
  if (expected && (hashCanonicalBody(value.attemptRef) !== hashCanonicalBody(expected.attemptRef) || value.activityId !== expected.activityId || value.starSlotId !== expected.starSlotId || value.progressCompatibilityKey !== expected.progressCompatibilityKey || hashCanonicalBody(value.scoringPolicyRef) !== hashCanonicalBody(expected.scoringPolicyRef) || value.evidenceComponentFingerprint !== expected.evidenceComponentFingerprint)) {
    throw new Error("v2_server_score_context_mismatch");
  }
}
