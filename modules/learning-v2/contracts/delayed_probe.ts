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

const isTupleKey = (value: unknown): value is string =>
  typeof value === "string" && /^letk1\.[A-Za-z0-9_-]+$/.test(value);

const isCandidateDisposition = (
  value: unknown,
): value is DelayedCandidateDisposition =>
  value === "assessed_candidate" ||
  value === "non_assessment_candidate" ||
  value === "no_record";

const isTerminalWindow = (value: unknown): value is V2DelayedTerminalWindow =>
  value === "inside_pinned_window" ||
  value === "outside_pinned_window" ||
  value === "system_failure";

export const validateDelayedAttemptCandidate = (
  candidate: Readonly<Record<string, unknown>>,
): { readonly ok: boolean } => {
  if (
    candidate.schemaVersion !== "v2-delayed-attempt-candidate.v1" ||
    !Array.isArray(candidate.learningTupleDispositions) ||
    "timingReceiptRef" in candidate ||
    "terminalTupleResolutions" in candidate ||
    "terminalResolution" in candidate ||
    "assessmentTiming" in candidate
  )
    return { ok: false };

  const seen = new Set<string>();
  for (const entry of candidate.learningTupleDispositions) {
    if (
      !isRecord(entry) ||
      !isTupleKey(entry.tupleKey) ||
      seen.has(entry.tupleKey) ||
      !isCandidateDisposition(entry.terminalDisposition)
    )
      return { ok: false };
    seen.add(entry.tupleKey);
  }
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
) => {
  if (
    !isTerminalWindow(window) ||
    !validateDelayedAttemptCandidate(candidate).ok
  )
    return { ok: false as const, resolutions: [] as const };

  const resolutions = (
    candidate.learningTupleDispositions as readonly Record<string, unknown>[]
  ).map((entry) => ({
    tupleKey: entry.tupleKey as string,
    sourceCandidateDisposition:
      entry.terminalDisposition as DelayedCandidateDisposition,
    terminalDisposition: resolveDisposition(
      entry.terminalDisposition as DelayedCandidateDisposition,
      window,
    ),
  }));
  return { ok: true as const, resolutions };
};
