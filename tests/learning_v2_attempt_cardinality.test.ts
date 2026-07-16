import { validateGraphTupleDispositions } from "../modules/learning-v2/contracts/attempt";

const declaration = {
  nodeId: "n",
  objectiveId: "o",
  skillId: "s",
  construct: "semantic" as const,
  phase: "near_transfer" as const,
  targetKind: "objective" as const,
  targetId: "o",
};

describe("Learning V2 attempt cardinality", () => {
  test("requires exactly one disposition per declared tuple", () => {
    expect(
      validateGraphTupleDispositions([declaration], [], "CORRECT").ok,
    ).toBe(false);
    expect(
      validateGraphTupleDispositions(
        [declaration],
        [
          { ...declaration, terminalDisposition: "assessed_candidate" },
          { ...declaration, terminalDisposition: "assessed_candidate" },
        ],
        "CORRECT",
      ).ok,
    ).toBe(false);
    expect(
      validateGraphTupleDispositions(
        [declaration],
        [
          {
            ...declaration,
            terminalDisposition: "no_record",
            reasonCode: "skipped_by_learner",
          },
        ],
        "SKIPPED",
      ).ok,
    ).toBe(true);
  });

  test("fails closed for malformed and duplicate direct validator input", () => {
    const assessed = {
      ...declaration,
      terminalDisposition: "assessed_candidate",
    } as const;
    expect(
      validateGraphTupleDispositions(
        [declaration, declaration],
        [assessed],
        "CORRECT",
      ).ok,
    ).toBe(false);
    expect(
      validateGraphTupleDispositions(
        [declaration],
        [{}] as unknown as readonly (typeof assessed)[],
        "CORRECT",
      ).ok,
    ).toBe(false);
    expect(
      validateGraphTupleDispositions(
        [declaration],
        [assessed, assessed],
        "CORRECT",
      ).ok,
    ).toBe(false);
  });
});
