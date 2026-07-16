import {
  buildLearningEvidenceTupleKey,
  type LearningEvidenceTupleIdentity,
} from "./evidence";
import {
  sanitizeAttemptBody,
  validateCanonicalAttemptRef,
  type CanonicalAttemptRef,
  type V2DelayedAttemptEventBody,
} from "./attempt";

export type V2DelayedTerminalWindow =
  | "inside_pinned_window"
  | "outside_pinned_window"
  | "system_failure";
type DelayedCandidateDisposition =
  | "assessed_candidate"
  | "non_assessment_candidate"
  | "no_record";
type DelayedTerminalDisposition =
  | "assessed"
  | "non_assessment"
  | "not_assessed_for_window"
  | "not_assessed_system"
  | "no_record";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key) => keys.includes(key));
const isTupleKey = (value: unknown): value is string =>
  typeof value === "string" && /^letk1\.[A-Za-z0-9_-]+$/.test(value);
const isTerminalWindow = (value: unknown): value is V2DelayedTerminalWindow =>
  value === "inside_pinned_window" ||
  value === "outside_pinned_window" ||
  value === "system_failure";
const isAttemptRef = (value: unknown): value is CanonicalAttemptRef =>
  isRecord(value) &&
  exactKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
  value.schemaVersion === "v2-attempt-ref.v1" &&
  typeof value.opId === "string" &&
  value.opId.length > 0 &&
  typeof value.attemptBodyHash === "string" &&
  /^[a-f0-9]{64}$/.test(value.attemptBodyHash);

const candidateDisposition = (
  body: V2DelayedAttemptEventBody["delayedCandidates"][number],
): DelayedCandidateDisposition => {
  if (body.candidateOutcome.resultCode === "SKIPPED") return "no_record";
  if (
    body.candidateOutcome.resultCode === "UNCERTAIN" ||
    body.candidateOutcome.resultCode === "INVALID_AUDIO_OR_SYSTEM"
  )
    return "non_assessment_candidate";
  return "assessed_candidate";
};

const readCandidateBody = (
  candidate: Readonly<Record<string, unknown>>,
): {
  readonly body: V2DelayedAttemptEventBody;
  readonly ref: CanonicalAttemptRef;
} | null => {
  if (
    !exactKeys(candidate, ["schemaVersion", "attemptBody", "attemptRef"]) ||
    candidate.schemaVersion !== "v2-delayed-attempt-candidate.v1" ||
    !isAttemptRef(candidate.attemptRef)
  )
    return null;
  try {
    const body = sanitizeAttemptBody(candidate.attemptBody);
    if (body.attemptSurface.kind !== "scheduled_delayed_probe") return null;
    if (!validateCanonicalAttemptRef(body, candidate.attemptRef).ok)
      return null;
    return {
      body: body as V2DelayedAttemptEventBody,
      ref: candidate.attemptRef,
    };
  } catch {
    return null;
  }
};

export const validateDelayedAttemptCandidate = (
  candidate: Readonly<Record<string, unknown>>,
  expectedTupleKeys?: readonly string[],
): { readonly ok: boolean } => {
  const parsed = readCandidateBody(candidate);
  if (!parsed) return { ok: false };
  const seen = new Set<string>();
  for (const entry of parsed.body.delayedCandidates) {
    const tupleKey = buildLearningEvidenceTupleKey(entry.binding);
    if (
      !isTupleKey(tupleKey) ||
      seen.has(tupleKey) ||
      entry.candidateEvidence.hintsUsed !== 0
    )
      return { ok: false };
    seen.add(tupleKey);
  }
  if (
    expectedTupleKeys &&
    (expectedTupleKeys.length !== seen.size ||
      expectedTupleKeys.some((key) => !seen.has(key)))
  )
    return { ok: false };
  return { ok: true };
};

const resolveDisposition = (
  disposition: DelayedCandidateDisposition,
  window: V2DelayedTerminalWindow,
): DelayedTerminalDisposition => {
  if (disposition === "no_record") return "no_record";
  if (window === "outside_pinned_window") return "not_assessed_for_window";
  if (window === "system_failure") return "not_assessed_system";
  return disposition === "assessed_candidate" ? "assessed" : "non_assessment";
};

export const resolveDelayedTerminal = (
  candidate: Readonly<Record<string, unknown>>,
  window: V2DelayedTerminalWindow,
  expectedTupleKeys?: readonly string[],
) => {
  const parsed = readCandidateBody(candidate);
  if (
    !isTerminalWindow(window) ||
    !parsed ||
    !validateDelayedAttemptCandidate(candidate, expectedTupleKeys).ok
  )
    return { ok: false as const, resolutions: [] as const };
  const resolutions = parsed.body.delayedCandidates.map((entry) => {
    const sourceCandidateDisposition = candidateDisposition(entry);
    return {
      tupleKey: buildLearningEvidenceTupleKey(entry.binding),
      sourceCandidateDisposition,
      terminalDisposition: resolveDisposition(
        sourceCandidateDisposition,
        window,
      ),
    };
  });
  return { ok: true as const, resolutions };
};
