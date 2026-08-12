import {
  V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  buildV2LocalEvaluatorCapsuleRawV1,
  createV2LocalEvaluatorCommitmentV1,
  evaluateV2LocalEvaluatorCapsuleV1,
  isV2LocalEvaluatorCapsuleHandleV1,
  parseV2LocalEvaluatorCapsuleV1,
  v2LocalEvaluatorInputKindForFamilyV1,
} from "../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";
import { V2_REQUIRED_SESSION_FAMILIES_V2 } from "../modules/learning-v2/contracts/activity_catalog_v2";

const SALT = "0123456789abcdef".repeat(4);
const identity = {
  capsuleId: "capsule:one",
  taskId: "task:one",
  activityId: "activity:one",
  family: "phrase_builder" as const,
  inputKind: "text" as const,
  normalizationLocale: "en-US",
  normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  salt: SALT,
};

describe("Learning V2 local evaluator capsule v1", () => {
  it("keeps raw commitments opaque and returns provisional verdicts only", () => {
    const commitment = createV2LocalEvaluatorCommitmentV1({
      ...identity,
      response: "I’m ready!",
    });
    const raw = buildV2LocalEvaluatorCapsuleRawV1({
      ...identity,
      acceptedCommitments: [commitment],
    });
    const handle = parseV2LocalEvaluatorCapsuleV1(raw);
    expect(isV2LocalEvaluatorCapsuleHandleV1(handle)).toBe(true);
    expect(handle).toMatchObject({
      normalizationRef: V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
      assessmentSecrecy: "none_device_inspectable",
      verdictAuthority: "local_provisional_only",
    });
    expect(handle).not.toHaveProperty("salt");
    expect(handle).not.toHaveProperty("acceptedCommitments");
    expect(
      evaluateV2LocalEvaluatorCapsuleV1(handle, {
        kind: "text",
        value: "  I'M READY ",
      }),
    ).toMatchObject({
      resultCode: "provisional_correct",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none",
      releaseAuthority: "none",
    });
    expect(
      evaluateV2LocalEvaluatorCapsuleV1(handle, {
        kind: "text",
        value: "not ready",
      }).resultCode,
    ).toBe("provisional_wrong");
    expect(
      evaluateV2LocalEvaluatorCapsuleV1(handle, {
        kind: "choice_token",
        value: "x",
      }).resultCode,
    ).toBe("technical_invalid");
    expect(
      evaluateV2LocalEvaluatorCapsuleV1(handle, null as never).resultCode,
    ).toBe("technical_invalid");
  });

  it("returns technical_invalid for unavailable scripted-repeat transcript", () => {
    const repeat = {
      ...identity,
      capsuleId: "capsule:repeat",
      taskId: "task:repeat",
      activityId: "activity:repeat",
      family: "scripted_repeat_compare" as const,
      inputKind: "transcript" as const,
    };
    const commitment = createV2LocalEvaluatorCommitmentV1({
      ...repeat,
      response: "Please repeat this",
    });
    const handle = parseV2LocalEvaluatorCapsuleV1(
      buildV2LocalEvaluatorCapsuleRawV1({
        ...repeat,
        acceptedCommitments: [commitment],
      }),
    );
    expect(
      evaluateV2LocalEvaluatorCapsuleV1(handle, {
        kind: "transcript",
        value: null,
      }).resultCode,
    ).toBe("technical_invalid");
    expect(
      evaluateV2LocalEvaluatorCapsuleV1(handle, {
        kind: "transcript",
        value: "please repeat this",
      }).resultCode,
    ).toBe("provisional_correct");
  });

  it("evaluates each of the exact seven required families", () => {
    for (const [index, family] of V2_REQUIRED_SESSION_FAMILIES_V2.entries()) {
      const inputKind = v2LocalEvaluatorInputKindForFamilyV1(family);
      const item = {
        capsuleId: `capsule:family:${index}`,
        taskId: `task:family:${index}`,
        activityId: `activity:family:${index}`,
        family,
        inputKind,
        normalizationLocale: "en-US",
        normalizationProfileHash:
          V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
        salt: SALT,
      };
      const response =
        inputKind === "choice_token" ? "option_1" : "Valid answer";
      const commitment = createV2LocalEvaluatorCommitmentV1({
        ...item,
        response,
      });
      const handle = parseV2LocalEvaluatorCapsuleV1(
        buildV2LocalEvaluatorCapsuleRawV1({
          ...item,
          acceptedCommitments: [commitment],
        }),
      );
      expect(
        evaluateV2LocalEvaluatorCapsuleV1(handle, {
          kind: inputKind,
          value: response,
        }).resultCode,
      ).toBe("provisional_correct");
    }
  });

  it("rejects unsorted commitments and authority escalation", () => {
    const commitments = ["a".repeat(64), "0".repeat(64)];
    expect(() =>
      parseV2LocalEvaluatorCapsuleV1(
        buildV2LocalEvaluatorCapsuleRawV1({
          ...identity,
          acceptedCommitments: commitments,
        }),
      ),
    ).toThrow(/sorted/);
    const valid = JSON.parse(
      buildV2LocalEvaluatorCapsuleRawV1({
        ...identity,
        acceptedCommitments: ["a".repeat(64)],
      }),
    );
    valid.masteryAuthority = "local";
    expect(() =>
      parseV2LocalEvaluatorCapsuleV1(canonicalJsonV1(valid)),
    ).toThrow(/authority/);
  });
});
