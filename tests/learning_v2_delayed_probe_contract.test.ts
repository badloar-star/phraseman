import {
  resolveDelayedTerminal,
  validateDelayedAttemptCandidate,
} from "../modules/learning-v2/contracts/delayed_probe";

describe("Learning V2 delayed probe contract", () => {
  test("keeps client candidates separate from server terminal resolution", () => {
    const candidate = {
      schemaVersion: "v2-delayed-attempt-candidate.v1",
      learningTupleDispositions: [
        { tupleKey: "letk1.x", terminalDisposition: "assessed_candidate" },
      ],
    };
    expect(validateDelayedAttemptCandidate(candidate).ok).toBe(true);
    expect(
      validateDelayedAttemptCandidate({
        ...candidate,
        timingReceiptRef: { forbidden: true },
      }).ok,
    ).toBe(false);
    expect(
      resolveDelayedTerminal(candidate, "outside_pinned_window").resolutions[0]
        .terminalDisposition,
    ).toBe("not_assessed_for_window");
    expect(
      resolveDelayedTerminal(candidate, "outside_pinned_window").resolutions[0]
        .sourceCandidateDisposition,
    ).toBe("assessed_candidate");
  });

  test("rejects duplicate or terminal client dispositions and preserves no-record", () => {
    const candidate = {
      schemaVersion: "v2-delayed-attempt-candidate.v1",
      learningTupleDispositions: [
        { tupleKey: "letk1.x", terminalDisposition: "no_record" },
      ],
    };
    expect(validateDelayedAttemptCandidate(candidate).ok).toBe(true);
    expect(
      resolveDelayedTerminal(candidate, "system_failure").resolutions,
    ).toEqual([
      {
        tupleKey: "letk1.x",
        sourceCandidateDisposition: "no_record",
        terminalDisposition: "no_record",
      },
    ]);
    expect(
      validateDelayedAttemptCandidate({
        ...candidate,
        learningTupleDispositions: [
          { tupleKey: "letk1.x", terminalDisposition: "assessed_candidate" },
          { tupleKey: "letk1.x", terminalDisposition: "no_record" },
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateDelayedAttemptCandidate({
        ...candidate,
        learningTupleDispositions: [
          { tupleKey: "letk1.x", terminalDisposition: "not_assessed_system" },
        ],
      }).ok,
    ).toBe(false);
    expect(resolveDelayedTerminal(candidate, "bad_window" as never).ok).toBe(
      false,
    );
  });
});
