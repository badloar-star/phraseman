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
  pages: [
    {
      pageOrdinal: 1 as const,
      conceptId: "hello",
      heading: "Hello",
      explanation: "A neutral greeting.",
      question: {
        taskId: "task-episode-1-s01-01",
        taskSlot: 1 as const,
        questionId: "question-1",
        coveredConceptIds: ["hello"],
        learnerSurfaceFingerprint: h("surface-1"),
        promptId: "prompt-1",
        prompt: "Visible question 1?",
        responseOptions: [
          { responseId: "response-1-a", text: "Visible option A" },
          { responseId: "response-1-b", text: "Visible option B" },
        ],
        accessibilityLabel: "Question 1",
      },
    },
    {
      pageOrdinal: 2 as const,
      conceptId: "name",
      heading: "I’m + name",
      explanation: "Introduce yourself.",
      question: {
        taskId: "task-episode-1-s01-02",
        taskSlot: 2 as const,
        questionId: "question-2",
        coveredConceptIds: ["name"],
        learnerSurfaceFingerprint: h("surface-2"),
        promptId: "prompt-2",
        prompt: "Visible question 2?",
        responseOptions: [
          { responseId: "response-2-a", text: "Visible option A" },
          { responseId: "response-2-b", text: "Visible option B" },
        ],
        accessibilityLabel: "Question 2",
      },
    },
    {
      pageOrdinal: 3 as const,
      conceptId: "meet",
      heading: "Nice to meet you",
      explanation: "Close the exchange.",
      question: {
        taskId: "task-episode-1-s01-03",
        taskSlot: 3 as const,
        questionId: "question-3",
        coveredConceptIds: ["meet"],
        learnerSurfaceFingerprint: h("surface-3"),
        promptId: "prompt-3",
        prompt: "Visible question 3?",
        responseOptions: [
          { responseId: "response-3-a", text: "Visible option A" },
          { responseId: "response-3-b", text: "Visible option B" },
        ],
        accessibilityLabel: "Question 3",
      },
    },
  ],
});

describe("Learning V2 learner-safe session intro projection", () => {
  it("projects three intro pages with one embedded question on each page", () => {
    const value =
      materializeLearningV2ActivitySessionIntroProjectionV1(input());
    expect(value.pages).toHaveLength(3);
    expect(value.pages.map((page) => page.question.taskSlot)).toEqual([
      1, 2, 3,
    ]);
    expect(value).toMatchObject({
      learnerVisibleFieldPolicy:
        "positive_allowlist_title_and_three_intro_pages_only",
      practiceStartSlot: 4,
      slotPresentationPolicy:
        "slots_1_2_3_are_embedded_in_intro_pages_and_must_not_repeat",
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
      parsedRaw.pages.every((page: Record<string, unknown>) =>
        [
          "correctResponse",
          "acceptedResponses",
          "evaluator",
          "salt",
          "commitment",
          "serverSidecar",
        ].every(
          (key) =>
            !Object.prototype.hasOwnProperty.call(
              page.question as Record<string, unknown>,
              key,
            ),
        ),
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
      raw.pages[0].question[key] = "forbidden";
      expect(() =>
        parseLearningV2ActivitySessionIntroProjectionV1(canonicalJsonV1(raw)),
      ).toThrow("learning_v2_activity_session_intro_projection_invalid");
    },
  );

  it("rejects detached questions, a wrong page-slot mapping and a question about another page", () => {
    const value =
      materializeLearningV2ActivitySessionIntroProjectionV1(input());
    for (const mutate of [
      (raw: any) => raw.pages.push(raw.pages[2]),
      (raw: any) => {
        raw.pages[0].question.taskSlot = 2;
      },
      (raw: any) => {
        raw.pages[0].question.coveredConceptIds = ["name"];
      },
    ]) {
      const raw = JSON.parse(
        encodeLearningV2ActivitySessionIntroProjectionV1(value),
      );
      mutate(raw);
      expect(() =>
        parseLearningV2ActivitySessionIntroProjectionV1(canonicalJsonV1(raw)),
      ).toThrow("learning_v2_activity_session_intro_projection_invalid");
    }
  });

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
