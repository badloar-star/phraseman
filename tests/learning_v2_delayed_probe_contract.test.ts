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
  });
});
