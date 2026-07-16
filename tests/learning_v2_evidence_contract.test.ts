import {
  buildLearningEvidenceTupleKey,
  type LearningEvidenceTupleIdentity,
} from "../modules/learning-v2/contracts/evidence";

const tuple = (
  overrides: Partial<LearningEvidenceTupleIdentity> = {},
): LearningEvidenceTupleIdentity => ({
  nodeId: "ep01.node|one",
  objectiveId: "objective,one",
  skillId: "skill.one",
  construct: "semantic",
  phase: "independent_probe",
  targetKind: "objective",
  targetId: "target|one",
  ...overrides,
});

describe("Learning V2 evidence tuple identity", () => {
  test("encodes the exact seven-field canonical tuple with a letk1 base64url key", () => {
    expect(buildLearningEvidenceTupleKey(tuple())).toBe(
      "letk1.WyJlcDAxLm5vZGV8b25lIiwib2JqZWN0aXZlLG9uZSIsInNraWxsLm9uZSIsInNlbWFudGljIiwiaW5kZXBlbmRlbnRfcHJvYmUiLCJvYmplY3RpdmUiLCJ0YXJnZXR8b25lIl0",
    );
  });

  test("keeps delimiter-containing identities distinct without collisions", () => {
    expect(
      buildLearningEvidenceTupleKey(
        tuple({ nodeId: "ep01.node", objectiveId: "one|objective" }),
      ),
    ).not.toBe(
      buildLearningEvidenceTupleKey(
        tuple({ nodeId: "ep01.node|one", objectiveId: "objective" }),
      ),
    );
  });

  test.each([
    ["node", { nodeId: "ep01.node02" }],
    ["objective", { objectiveId: "objective.two" }],
    ["skill", { skillId: "skill.two" }],
    ["construct", { construct: "listening" }],
    ["phase", { phase: "delayed_probe" }],
    ["target kind", { targetKind: "semantic_slot" }],
    ["target", { targetId: "target.two" }],
  ] as const)("changes when only %s changes", (_field, overrides) => {
    expect(buildLearningEvidenceTupleKey(tuple(overrides))).not.toBe(
      buildLearningEvidenceTupleKey(tuple()),
    );
  });
});
