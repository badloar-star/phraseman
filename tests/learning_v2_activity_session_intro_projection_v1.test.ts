import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";
import {
  encodeLearningV2ActivitySessionIntroProjectionV1,
  isLearningV2ActivitySessionIntroProjectionV1,
  materializeLearningV2ActivitySessionIntroProjectionV1,
  parseLearningV2ActivitySessionIntroProjectionV1,
} from "../modules/learning-v2/runtime/activity_session_intro_projection_v1";

const h = (value: string) => hashCanonicalBody({ value });
const input = () => ({
  contentClass: "production_candidate" as const,
  introId: "intro-episode-1-s01",
  introFingerprint: h("intro"),
  sourceSubjectFingerprint: h("source"),
  episodeId: "episode-1",
  sessionId: "episode-1:session:01",
  sessionOrdinal: 1,
  targetLanguage: "en",
  title: "Hello, I’m…",
  paragraphs: [
    "Use Hello to start a conversation.",
    "Use I’m before your name.",
  ],
  concepts: [
    {
      conceptId: "hello",
      heading: "Hello",
      explanation: "A neutral greeting.",
    },
    {
      conceptId: "name",
      heading: "I’m + name",
      explanation: "Introduce yourself.",
    },
    {
      conceptId: "meet",
      heading: "Nice to meet you",
      explanation: "Close the exchange.",
    },
  ],
  questions: [1, 2, 3].map((ordinal) => ({
    taskId: `task-episode-1-s01-0${ordinal}`,
    questionId: `question-${ordinal}`,
    coveredConceptIds: [["hello"], ["name"], ["meet"]][ordinal - 1],
    learnerSurfaceFingerprint: h(`surface-${ordinal}`),
    promptId: `prompt-${ordinal}`,
    prompt: `Visible question ${ordinal}?`,
    responseOptions: [
      { responseId: `response-${ordinal}-a`, text: "Visible option A" },
      { responseId: `response-${ordinal}-b`, text: "Visible option B" },
    ],
    accessibilityLabel: `Question ${ordinal}`,
  })),
});

describe("Learning V2 learner-safe session intro projection", () => {
  it("projects only learner-visible intro and three question surfaces", () => {
    const value =
      materializeLearningV2ActivitySessionIntroProjectionV1(input());
    expect(value.questions).toHaveLength(3);
    expect(value).toMatchObject({
      learnerVisibleFieldPolicy:
        "positive_allowlist_title_paragraphs_concepts_questions_only",
      evaluatorDataPolicy: "none",
      answerDataPolicy: "none",
      serverSidecarPolicy: "none",
      repositoryAuthority: "none",
      storageAuthority: "none",
      releaseAuthority: false,
    });
    const raw = encodeLearningV2ActivitySessionIntroProjectionV1(value);
    const parsedRaw = JSON.parse(raw);
    expect(
      parsedRaw.questions.every((question: Record<string, unknown>) =>
        [
          "correctResponse",
          "acceptedResponses",
          "evaluator",
          "salt",
          "commitment",
          "serverSidecar",
        ].every((key) => !Object.prototype.hasOwnProperty.call(question, key)),
      ),
    ).toBe(true);
    expect(parseLearningV2ActivitySessionIntroProjectionV1(raw)).toEqual(value);
    expect(isLearningV2ActivitySessionIntroProjectionV1({ ...value })).toBe(
      false,
    );
  });

  it.each(["correctResponse", "acceptedResponses", "salt", "serverSidecar"])(
    "rejects forbidden nested learner field %s",
    (key) => {
      const value =
        materializeLearningV2ActivitySessionIntroProjectionV1(input());
      const raw = JSON.parse(
        encodeLearningV2ActivitySessionIntroProjectionV1(value),
      );
      raw.questions[0][key] = "forbidden";
      expect(() =>
        parseLearningV2ActivitySessionIntroProjectionV1(canonicalJsonV1(raw)),
      ).toThrow("learning_v2_activity_session_intro_projection_invalid");
    },
  );

  it("rejects authority escalation, answer-like extra fields, noncanonical and oversized raw", () => {
    const value =
      materializeLearningV2ActivitySessionIntroProjectionV1(input());
    const authority = JSON.parse(
      encodeLearningV2ActivitySessionIntroProjectionV1(value),
    );
    authority.runtimeAuthority = "release_ready";
    expect(() =>
      parseLearningV2ActivitySessionIntroProjectionV1(
        canonicalJsonV1(authority),
      ),
    ).toThrow();
    expect(() =>
      parseLearningV2ActivitySessionIntroProjectionV1(
        JSON.stringify(value, null, 2),
      ),
    ).toThrow();
    expect(() =>
      parseLearningV2ActivitySessionIntroProjectionV1(
        "x".repeat(64 * 1024 + 1),
      ),
    ).toThrow();
  });
});
