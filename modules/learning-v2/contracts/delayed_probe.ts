export type V2DelayedTerminalWindow =
  | "inside_pinned_window"
  | "outside_pinned_window"
  | "system_failure";
export const validateDelayedAttemptCandidate = (
  candidate: Readonly<Record<string, unknown>>,
): { readonly ok: boolean } => ({
  ok:
    candidate.schemaVersion === "v2-delayed-attempt-candidate.v1" &&
    Array.isArray(candidate.learningTupleDispositions) &&
    !("timingReceiptRef" in candidate) &&
    !("terminalTupleResolutions" in candidate),
});
export const resolveDelayedTerminal = (
  candidate: Readonly<Record<string, unknown>>,
  window: V2DelayedTerminalWindow,
) => ({
  resolutions: (
    (candidate.learningTupleDispositions as readonly Record<
      string,
      unknown
    >[]) ?? []
  ).map((entry) => ({
    tupleKey: String(entry.tupleKey),
    terminalDisposition:
      window === "outside_pinned_window"
        ? "not_assessed_for_window"
        : window === "system_failure"
          ? "not_assessed_system"
          : String(entry.terminalDisposition),
  })),
});
