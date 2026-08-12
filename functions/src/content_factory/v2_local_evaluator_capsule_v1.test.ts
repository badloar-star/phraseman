import {
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1,
  buildV2LocalEvaluatorCapsuleRawV1,
  createV2LocalEvaluatorCommitmentV1,
  evaluateV2LocalEvaluatorCapsuleV1,
  normalizeV2LocalEvaluatorResponseV1,
  parseV2LocalEvaluatorCapsuleV1,
} from "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1";

const identity = {
  capsuleId: "capsule-1",
  taskId: "task-1",
  activityId: "activity-1",
  family: "phrase_builder" as const,
  inputKind: "text" as const,
  normalizationLocale: "en",
  normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  salt: "a".repeat(64),
};

describe("Learning V2 local evaluator capsule v1", () => {
  it("publishes one exact response-kind matrix", () => {
    expect(V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1).toEqual({
      phrase_builder: "text",
      listen_choose: "choice_token",
      sound_contrast: "choice_token",
      listen_build_dictation: "text",
      context_gap_grammar: "choice_token",
      speed_match: "choice_token",
      scripted_repeat_compare: "transcript",
    });
  });

  it.each([
    ["uk", "ПРИВІТ, СВІТ!", "привіт світ"],
    ["vi", "XIN CHÀO", "xin chào"],
    ["tr", "İYİ GÜNLER", "iyi günler"],
    ["pl", "ŻÓŁĆ", "żółć"],
    ["en", "DON’T STOP", "don't stop"],
  ])("normalizes supported Unicode for %s", (locale, value, expected) => {
    expect(normalizeV2LocalEvaluatorResponseV1("text", value, locale)).toBe(
      expected,
    );
  });

  it("applies cheap response caps before expensive normalization", () => {
    expect(
      normalizeV2LocalEvaluatorResponseV1("text", "Ж".repeat(1025), "uk"),
    ).toBeNull();
    expect(
      normalizeV2LocalEvaluatorResponseV1(
        "choice_token",
        "a".repeat(1025),
        "en",
      ),
    ).toBeNull();
  });

  it("binds profile hash and locale into commitments and provisional evaluation", () => {
    const accepted = createV2LocalEvaluatorCommitmentV1({
      ...identity,
      response: "I",
    });
    const turkish = createV2LocalEvaluatorCommitmentV1({
      ...identity,
      normalizationLocale: "tr",
      response: "I",
    });
    expect(turkish).not.toBe(accepted);

    const raw = buildV2LocalEvaluatorCapsuleRawV1({
      ...identity,
      acceptedCommitments: [accepted],
    });
    const handle = parseV2LocalEvaluatorCapsuleV1(raw);
    expect(
      evaluateV2LocalEvaluatorCapsuleV1(handle, {
        kind: "text",
        value: "i",
      }).resultCode,
    ).toBe("provisional_correct");
    expect(
      evaluateV2LocalEvaluatorCapsuleV1(handle, {
        kind: "text",
        value: "wrong",
      }).resultCode,
    ).toBe("provisional_wrong");
    expect(
      evaluateV2LocalEvaluatorCapsuleV1(handle, {
        kind: "choice_token",
        value: "i",
      }).resultCode,
    ).toBe("technical_invalid");
  });

  it("rejects forged profile identity and oversized raw before JSON work", () => {
    const accepted = createV2LocalEvaluatorCommitmentV1({
      ...identity,
      response: "hello",
    });
    const decoded = JSON.parse(
      buildV2LocalEvaluatorCapsuleRawV1({
        ...identity,
        acceptedCommitments: [accepted],
      }),
    );
    decoded.normalizationProfileHash = "b".repeat(64);
    expect(() =>
      parseV2LocalEvaluatorCapsuleV1(JSON.stringify(decoded)),
    ).toThrow("invalid evaluator normalization/salt");
    expect(() =>
      parseV2LocalEvaluatorCapsuleV1(" ".repeat(64 * 1024 + 1)),
    ).toThrow("invalid local evaluator capsule bytes");
  });
});
