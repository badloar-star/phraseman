import {
  encodeLearningV2CourseSessionEvaluatorCapsuleChildV1,
  evaluateLearningV2CourseSessionInteractionV1,
  materializeLearningV2CourseSessionEvaluatorCapsuleChildV1,
  parseLearningV2CourseSessionEvaluatorCapsuleChildV1,
} from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";

const SALT = "0123456789abcdef".repeat(4);

function child() {
  return materializeLearningV2CourseSessionEvaluatorCapsuleChildV1({
    courseSessionId: "lesson-01:session:01",
    entries: Array.from({ length: 14 }, (_, index) => ({
      interactionId: `interaction:${index + 1}`,
      activityId: `activity:${index + 1}`,
      capsuleId: `capsule:${index + 1}`,
      family:
        index % 2 === 0
          ? ("phrase_builder" as const)
          : ("listen_choose" as const),
      normalizationLocale: "en-US",
      salt: SALT.slice(0, 63) + String(index % 10),
      acceptedResponses: [index % 2 === 0 ? "I am ready" : "option_1"],
    })),
  });
}

describe("Learning V2 course session evaluator capsule child", () => {
  test("round-trips inspectable commitments and evaluates only provisionally", () => {
    const parsed = parseLearningV2CourseSessionEvaluatorCapsuleChildV1(
      encodeLearningV2CourseSessionEvaluatorCapsuleChildV1(child()),
    );
    expect(JSON.stringify(parsed)).not.toMatch(
      /correctResponse|acceptedResponses|I am ready|option_1/u,
    );
    expect(
      evaluateLearningV2CourseSessionInteractionV1(parsed, "interaction:1", {
        kind: "text",
        value: "I AM READY",
      }),
    ).toMatchObject({
      resultCode: "provisional_correct",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none",
    });
    expect(
      evaluateLearningV2CourseSessionInteractionV1(parsed, "interaction:2", {
        kind: "choice_token",
        value: "wrong",
      }).resultCode,
    ).toBe("provisional_wrong");
  });

  test("rejects coordinated capsule substitution and plaintext answer fields", () => {
    const raw = encodeLearningV2CourseSessionEvaluatorCapsuleChildV1(child());
    const decoded = JSON.parse(raw);
    decoded.entries[0].capsuleRawHash = "f".repeat(64);
    expect(() =>
      parseLearningV2CourseSessionEvaluatorCapsuleChildV1(
        canonicalJsonV1(decoded),
      ),
    ).toThrow();
    const withAnswer = JSON.parse(raw);
    withAnswer.entries[0].correctResponse = "I am ready";
    expect(() =>
      parseLearningV2CourseSessionEvaluatorCapsuleChildV1(
        canonicalJsonV1(withAnswer),
      ),
    ).toThrow();
  });
});
