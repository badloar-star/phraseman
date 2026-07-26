import {
  projectCheckpointEvidence,
  type CheckpointRequirement,
} from "../modules/learning-v2/progress/checkpoint_projection";

describe("Learning V2 checkpoint projection", () => {
  const requirements: readonly CheckpointRequirement[] = [
    {
      tupleKey: "letk1.a",
      targetKind: "semantic_slot",
      targetId: "slot-a",
      phase: "independent_probe",
      assessmentNodeId: "node-a",
      objectiveId: "objective-a",
    },
    {
      tupleKey: "letk1.b",
      targetKind: "critical_constraint",
      targetId: "constraint-b",
      phase: "independent_probe",
      assessmentNodeId: "node-b",
      objectiveId: "objective-b",
    },
  ];
  const contract = {
    tupleKeys: ["letk1.a", "letk1.b"],
    assessedObjectiveIds: ["objective-a", "objective-b"],
    assessmentNodeIds: ["node-a", "node-b"],
    criticalSemanticSlotTupleKeys: ["letk1.a"],
    criticalConstraintTupleKeys: ["letk1.b"],
    repairTupleKeys: ["letk1.a"],
    alternateTupleKeys: ["letk1.b"],
  } as const;

  it("passes only when every declared critical tuple has assessed success", () => {
    expect(
      projectCheckpointEvidence(
        requirements,
        {
          "letk1.a": { status: "assessed", outcome: "success", ref: "a" },
          "letk1.b": { status: "assessed", outcome: "success", ref: "b" },
        },
        contract,
      ),
    ).toMatchObject({ decision: "passed", complete: true });
  });

  it("keeps needs_work/incomplete/outside-window from becoming success", () => {
    expect(
      projectCheckpointEvidence(
        requirements,
        {
          "letk1.a": {
            status: "assessed",
            outcome: "needs_work",
            ref: "a",
            repairRouteDeclared: true,
          },
          "letk1.b": { status: "not_assessed", reason: "outside_window" },
        },
        { ...contract, repairTupleKeys: ["letk1.a"] },
      ),
    ).toMatchObject({ decision: "repair_required", complete: false });
  });

  it("rejects an index that exceeds the declared tuple set", () => {
    expect(() =>
      projectCheckpointEvidence(
        requirements,
        {
          "letk1.a": { status: "assessed", outcome: "success", ref: "a" },
          "letk1.b": { status: "assessed", outcome: "success", ref: "b" },
          "letk1.extra": { status: "assessed", outcome: "success", ref: "x" },
        },
        contract,
      ),
    ).toThrow("checkpoint_tuple_mismatch");
  });
});
