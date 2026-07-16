import {
  buildLearningEvidenceTupleKey,
  type LearningEvidenceTupleIdentity,
} from "./evidence";
import { hashCanonicalBody } from "../policies/decision_registry";

export type V2AttemptOutcome = {
  readonly resultCode:
    | "CORRECT"
    | "WRONG"
    | "COMPLETED"
    | "SKIPPED"
    | "PASS_CONFIDENT"
    | "NEEDS_WORK_CONFIDENT"
    | "UNCERTAIN"
    | "INVALID_AUDIO_OR_SYSTEM";
};
export interface V2AttemptEvidence {
  readonly hintsUsed: number;
}
export interface V2AttemptProvenance {
  readonly phase:
    | "encounter_build"
    | "near_transfer"
    | "independent_probe"
    | "delayed_probe";
}
export interface V2AttemptInputBinding {
  readonly source:
    | "keyboard"
    | "tap"
    | "word_bank"
    | "microphone"
    | "accessibility_alternative";
}
interface V2AttemptEventBodyBase {
  readonly schemaVersion: "v2-attempt-body.v1";
  readonly opId: string;
  readonly outcome: V2AttemptOutcome;
  readonly evidence: V2AttemptEvidence;
  readonly provenance: V2AttemptProvenance;
  readonly inputBinding: V2AttemptInputBinding;
}
export type V2GraphAttemptEventBody = V2AttemptEventBodyBase & {
  readonly attemptSurface: { readonly kind: "episode_graph_node" };
  readonly learningTupleDispositions: readonly V2GraphTupleDisposition[];
};
export interface V2DelayedClientCandidate {
  readonly candidateId: string;
  readonly binding: LearningEvidenceTupleIdentity;
  readonly candidateOutcome: V2AttemptOutcome;
  readonly candidateEvidence: V2AttemptEvidence;
}
export type V2DelayedAttemptEventBody = V2AttemptEventBodyBase & {
  readonly attemptSurface: { readonly kind: "scheduled_delayed_probe" };
  readonly delayedCandidates: readonly V2DelayedClientCandidate[];
};
export type V2AttemptEventBody =
  | V2GraphAttemptEventBody
  | V2DelayedAttemptEventBody;
export interface CanonicalAttemptRef {
  readonly schemaVersion: "v2-attempt-ref.v1";
  readonly opId: string;
  readonly attemptBodyHash: string;
}
export type V2GraphTupleDisposition = LearningEvidenceTupleIdentity & {
  readonly terminalDisposition:
    | "assessed_candidate"
    | "non_assessment_candidate"
    | "no_record";
  readonly reasonCode?: "skipped_by_learner";
};

const postHashAttemptBodyKeys = [
  "learningEvidenceRefs",
  "learningNonAssessmentRefs",
  "attemptBodyHash",
  "canonicalAttemptRef",
] as const;
const delayedServerOwnedKeys = [
  "learningTupleDispositions",
  "terminalDisposition",
  "terminalResolution",
  "serverResolution",
  "serverResolutionRef",
  "timingReceiptRef",
] as const;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOneOf = <T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] => typeof value === "string" && allowed.includes(value);

const isValidEvidence = (value: unknown): value is V2AttemptEvidence =>
  isRecord(value) &&
  typeof value.hintsUsed === "number" &&
  Number.isInteger(value.hintsUsed) &&
  value.hintsUsed >= 0;

const hasForbiddenOwnKey = (
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean =>
  keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));

const hasForbiddenKeyRecursively = (
  value: unknown,
  keys: readonly string[],
  seen = new WeakSet<object>(),
): boolean => {
  if (Array.isArray(value))
    return value.some((entry) => hasForbiddenKeyRecursively(entry, keys, seen));
  if (!isRecord(value)) return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.entries(value).some(
    ([key, entry]) =>
      keys.includes(key) || hasForbiddenKeyRecursively(entry, keys, seen),
  );
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isValidLearningTupleIdentity = (
  value: unknown,
  requiredPhase?: "delayed_probe",
): value is LearningEvidenceTupleIdentity =>
  isRecord(value) &&
  isNonEmptyString(value.nodeId) &&
  isNonEmptyString(value.objectiveId) &&
  isNonEmptyString(value.skillId) &&
  hasOneOf(value.construct, [
    "semantic",
    "listening",
    "recall",
    "spoken",
    "interaction",
  ] as const) &&
  hasOneOf(value.phase, [
    "encounter_build",
    "near_transfer",
    "independent_probe",
    "delayed_probe",
  ] as const) &&
  (requiredPhase === undefined || value.phase === requiredPhase) &&
  hasOneOf(value.targetKind, [
    "objective",
    "semantic_slot",
    "critical_constraint",
  ] as const) &&
  isNonEmptyString(value.targetId);

const isValidGraphTupleDisposition = (
  value: unknown,
): value is V2GraphTupleDisposition =>
  isRecord(value) &&
  isValidLearningTupleIdentity(value) &&
  hasOneOf(value.terminalDisposition, [
    "assessed_candidate",
    "non_assessment_candidate",
    "no_record",
  ] as const) &&
  (value.reasonCode === undefined || value.reasonCode === "skipped_by_learner");

const isValidDelayedCandidate = (
  value: unknown,
): value is V2DelayedClientCandidate =>
  isRecord(value) &&
  isNonEmptyString(value.candidateId) &&
  isValidLearningTupleIdentity(value.binding, "delayed_probe") &&
  isRecord(value.candidateOutcome) &&
  hasOneOf(value.candidateOutcome.resultCode, [
    "CORRECT",
    "WRONG",
    "COMPLETED",
    "SKIPPED",
    "PASS_CONFIDENT",
    "NEEDS_WORK_CONFIDENT",
    "UNCERTAIN",
    "INVALID_AUDIO_OR_SYSTEM",
  ] as const) &&
  isValidEvidence(value.candidateEvidence);

/**
 * Accepts only the hash-free canonical body.  Post-hash chain fields belong to
 * a later materialization envelope and are never silently removed here.
 */
export const sanitizeAttemptBody = (input: unknown): V2AttemptEventBody => {
  if (!isRecord(input)) throw new Error("attempt_body_invalid");
  if (hasForbiddenKeyRecursively(input, postHashAttemptBodyKeys)) {
    throw new Error("attempt_body_post_hash_field_forbidden");
  }

  const surface = input.attemptSurface;
  const outcome = input.outcome;
  const evidence = input.evidence;
  const provenance = input.provenance;
  const inputBinding = input.inputBinding;
  if (
    input.schemaVersion !== "v2-attempt-body.v1" ||
    typeof input.opId !== "string" ||
    input.opId.trim().length === 0 ||
    !isRecord(surface) ||
    !hasOneOf(surface.kind, [
      "episode_graph_node",
      "scheduled_delayed_probe",
    ] as const) ||
    !isRecord(outcome) ||
    !hasOneOf(outcome.resultCode, [
      "CORRECT",
      "WRONG",
      "COMPLETED",
      "SKIPPED",
      "PASS_CONFIDENT",
      "NEEDS_WORK_CONFIDENT",
      "UNCERTAIN",
      "INVALID_AUDIO_OR_SYSTEM",
    ] as const) ||
    !isValidEvidence(evidence) ||
    !isRecord(provenance) ||
    !hasOneOf(provenance.phase, [
      "encounter_build",
      "near_transfer",
      "independent_probe",
      "delayed_probe",
    ] as const) ||
    !isRecord(inputBinding) ||
    !hasOneOf(inputBinding.source, [
      "keyboard",
      "tap",
      "word_bank",
      "microphone",
      "accessibility_alternative",
    ] as const)
  ) {
    throw new Error("attempt_body_invalid");
  }

  if (surface.kind === "episode_graph_node") {
    if (provenance.phase === "delayed_probe") {
      throw new Error("attempt_body_surface_phase_mismatch");
    }
    if (
      Object.prototype.hasOwnProperty.call(input, "delayedCandidates") ||
      !Array.isArray(input.learningTupleDispositions) ||
      !input.learningTupleDispositions.every(isValidGraphTupleDisposition) ||
      new Set(
        input.learningTupleDispositions.map(buildLearningEvidenceTupleKey),
      ).size !== input.learningTupleDispositions.length
    ) {
      throw new Error("attempt_body_graph_dispositions_invalid");
    }
    return Object.freeze({ ...input }) as unknown as V2GraphAttemptEventBody;
  }

  if (provenance.phase !== "delayed_probe") {
    throw new Error("attempt_body_surface_phase_mismatch");
  }
  if (
    hasForbiddenOwnKey(input, delayedServerOwnedKeys) ||
    (Array.isArray(input.delayedCandidates) &&
      hasForbiddenKeyRecursively(
        input.delayedCandidates,
        delayedServerOwnedKeys,
      ))
  ) {
    throw new Error("attempt_body_delayed_server_field_forbidden");
  }
  if (
    !Array.isArray(input.delayedCandidates) ||
    !input.delayedCandidates.every(isValidDelayedCandidate)
  ) {
    throw new Error("attempt_body_delayed_candidate_invalid");
  }
  const candidates =
    input.delayedCandidates as readonly V2DelayedClientCandidate[];
  const candidateIds = new Set(
    candidates.map((candidate) => candidate.candidateId),
  );
  const bindingKeys = new Set(
    candidates.map((candidate) =>
      buildLearningEvidenceTupleKey(candidate.binding),
    ),
  );
  if (
    candidateIds.size !== candidates.length ||
    bindingKeys.size !== candidates.length
  ) {
    throw new Error("attempt_body_delayed_candidate_duplicate");
  }
  return Object.freeze({ ...input }) as unknown as V2DelayedAttemptEventBody;
};

export const buildCanonicalAttemptRef = (
  body: V2AttemptEventBody,
): CanonicalAttemptRef => ({
  schemaVersion: "v2-attempt-ref.v1",
  opId: body.opId,
  attemptBodyHash: hashCanonicalBody(body),
});

/** Verifies that a ref is the exact canonical hash of a hash-free body. */
export const validateCanonicalAttemptRef = (
  body: unknown,
  ref: CanonicalAttemptRef,
): { readonly ok: boolean } => {
  try {
    const sanitized = sanitizeAttemptBody(body);
    return {
      ok:
        ref.schemaVersion === "v2-attempt-ref.v1" &&
        ref.opId === sanitized.opId &&
        ref.attemptBodyHash === hashCanonicalBody(sanitized),
    };
  } catch {
    return { ok: false };
  }
};

export const validateGraphTupleDispositions = (
  declarations: readonly LearningEvidenceTupleIdentity[],
  dispositions: readonly V2GraphTupleDisposition[],
  resultCode: string,
): { readonly ok: boolean } => {
  const declarationEntries = declarations as readonly unknown[];
  const dispositionEntries = dispositions as readonly unknown[];
  if (
    !Array.isArray(declarationEntries) ||
    !Array.isArray(dispositionEntries) ||
    !declarationEntries.every((entry) => isValidLearningTupleIdentity(entry)) ||
    !dispositionEntries.every(isValidGraphTupleDisposition)
  ) {
    return { ok: false };
  }
  const expected = declarationEntries.map(buildLearningEvidenceTupleKey).sort();
  const actual = dispositionEntries.map(buildLearningEvidenceTupleKey).sort();
  if (
    new Set(expected).size !== expected.length ||
    new Set(actual).size !== actual.length
  ) {
    return { ok: false };
  }
  const exact =
    expected.length === actual.length &&
    expected.every((key, index) => key === actual[index]);
  const skipped = resultCode === "SKIPPED";
  return {
    ok:
      exact &&
      dispositions.every((entry) =>
        skipped
          ? entry.terminalDisposition === "no_record" &&
            entry.reasonCode === "skipped_by_learner"
          : entry.terminalDisposition !== "no_record",
      ),
  };
};
