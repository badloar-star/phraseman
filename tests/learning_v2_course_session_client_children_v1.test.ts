import {
  encodeLearningV2CourseSessionAuxiliaryChildV1,
  encodeLearningV2CourseSessionIntroChildV1,
  encodeLearningV2CourseSessionLearnerChildV1,
  bindLearningV2CourseSessionLearnerProjectionToSourceV1,
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionIntroChildV1,
  materializeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionSavablePhraseV1,
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
  learnerProjectionFingerprintV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";

const locales = [
  "ru",
  "uk",
  "es",
  "en",
  "pt-BR",
  "vi",
  "id",
  "tr",
  "pl",
] as const;
const localized = (prefix: string) =>
  Object.freeze(
    Object.fromEntries(
      locales.map((locale) => [locale, `${prefix} ${locale}`]),
    ),
  ) as any;
const ids = Array.from(
  { length: 16 },
  (_, index) => `interaction-${index + 1}`,
);

test("trusted transport binding preserves projected raw while joining audio to verified source fingerprint", () => {
  const projected = learner();
  const projectedRaw = encodeLearningV2CourseSessionLearnerChildV1(projected);
  const sourceFingerprint = "a".repeat(64);
  const bound = bindLearningV2CourseSessionLearnerProjectionToSourceV1({
    projectedLearner: projected,
    projectedLearnerRaw: projectedRaw,
    expectedProjectionFingerprint: projected.learnerFingerprint,
    sourceLearnerFingerprint: sourceFingerprint,
  });

  expect(bound.learnerFingerprint).toBe(sourceFingerprint);
  expect(learnerProjectionFingerprintV1(bound)).toBe(projected.learnerFingerprint);
  expect(encodeLearningV2CourseSessionLearnerChildV1(bound)).toBe(projectedRaw);
  expect(JSON.parse(projectedRaw).learnerFingerprint).toBe(projected.learnerFingerprint);
  expect(() => bindLearningV2CourseSessionLearnerProjectionToSourceV1({
    projectedLearner: projected,
    projectedLearnerRaw: projectedRaw,
    expectedProjectionFingerprint: "b".repeat(64),
    sourceLearnerFingerprint: sourceFingerprint,
  })).toThrow("learning_v2_course_session_client_child_invalid");
});

function intro() {
  return materializeLearningV2CourseSessionIntroChildV1({
    courseSessionId: "lesson-01:session:01",
    learningOutcomeByLocale: localized("Outcome"),
    pages: [1, 2, 3].map((ordinal) => ({
      pageOrdinal: ordinal as 1 | 2 | 3,
      pageId: `page-${ordinal}`,
      kind:
        ordinal === 1
          ? ("concept" as const)
          : ordinal === 2
            ? ("formula" as const)
            : ("example" as const),
      titleByLocale: localized(`Title ${ordinal}`),
      bodyByLocale: localized(`Body ${ordinal}`),
      question: {
        interactionId: ids[ordinal - 1]!,
        promptByLocale: localized(`Question ${ordinal}`),
        choicesByLocale: Object.freeze(
          Object.fromEntries(
            locales.map((locale) => [locale, [`A ${ordinal}`, `B ${ordinal}`]]),
          ),
        ) as any,
        accessibilityLabelByLocale: localized(`Accessibility ${ordinal}`),
      },
    })) as any,
  });
}

function learner() {
  return materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: "lesson-01:session:01",
    targetLanguage: "en-US",
    interactionProfile: "standard",
    interactions: ids.slice(3).map((interactionId, index) => ({
      interactionId,
      ordinal: index + 4,
      purpose:
        index < 5
          ? ("supported_practice" as const)
          : ("retrieval_practice" as const),
      family: "phrase_builder" as const,
      inputMode: "ordered_tokens" as const,
      prompt: `Build ${index + 1}`,
      responseOptions: [
        { responseId: `word-${index + 1}`, text: `word${index + 1}` },
      ],
      mediaIds: [],
      audioTargetIds: [`audio-${index + 1}`],
      accessibilityLabel: `Build ${index + 1}`,
      modePayload: null,
      scriptedAlternate: null,
    })),
  });
}

function auxiliary() {
  return materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId: "lesson-01:session:01",
    entries: ids.map((interactionId, index) => ({
      interactionId,
      report: {
        available: true as const,
        reportContextRef: `report-${index + 1}`,
        screen: "learning_v2_session" as const,
      },
      save: materializeLearningV2CourseSessionSavablePhraseV1({
        targetLanguage: "en-US",
        targetText: `phrase ${index + 1}`,
        meaningByLocale: localized(`Meaning ${index + 1}`),
      }),
      voice: {
        available: true,
        tapToRecordAllowed: true as const,
        holdToTalkAllowed: true as const,
      },
      secondErrorExplanationRef: `error-${index + 1}`,
      secondErrorExplanationByLocale: localized(`Explanation ${index + 1}`),
      responseFeedbackById: {
        [`wrong-${index + 1}`]: localized(`Chosen trap ${index + 1}`),
      },
    })),
  });
}

describe("Learning V2 direct session learner child contracts", () => {
  test("round-trips three intro pages with one embedded question each", () => {
    const value = intro();
    const parsed = parseLearningV2CourseSessionIntroChildV1(
      encodeLearningV2CourseSessionIntroChildV1(value),
    );
    expect(parsed.pages).toHaveLength(3);
    expect(parsed.pages.map((page) => page.question.interactionId)).toEqual(
      ids.slice(0, 3),
    );
    expect(parsed.questionPolicy).toBe(
      "one_question_at_bottom_of_each_intro_page_no_post_intro_duplicate",
    );
    expect(
      parsed.pages.every((page) => !("bodyRunsByLocale" in page)),
    ).toBe(true);
    expect(JSON.stringify(parsed)).not.toMatch(
      /correct|accepted|answerKey|salt|commitment/iu,
    );
  });

  test("requires report, save and local voice controls on every interaction", () => {
    const value = auxiliary();
    expect(
      value.entries.every(
        (entry) =>
          entry.report.available === true &&
          entry.save.available === true &&
          entry.voice.available === true &&
          entry.voice.tapToRecordAllowed === true &&
          entry.voice.holdToTalkAllowed === true,
      ),
    ).toBe(true);
    const raw = JSON.parse(
      encodeLearningV2CourseSessionAuxiliaryChildV1(value),
    );
    raw.entries[0].voice.available = false;
    expect(() =>
      parseLearningV2CourseSessionAuxiliaryChildV1(canonicalJsonV1(raw)),
    ).toThrow("learning_v2_course_session_client_child_invalid");
  });

  test("round-trips adaptive practice without evaluator or accepted answers", () => {
    const parsed = parseLearningV2CourseSessionLearnerChildV1(
      encodeLearningV2CourseSessionLearnerChildV1(learner()),
    );
    expect(parsed.practiceInteractionCount).toBe(13);
    expect(parsed.interactions[0].ordinal).toBe(4);
    expect(parsed.interactions.at(-1)?.ordinal).toBe(16);
    expect(parsed.evaluatorPayload).toBe("absent_by_exact_schema");
    expect(parsed.acceptedAnswerPayload).toBe("absent_by_exact_schema");
  });

  test("projects nested correctness markers out of the canonical learner child", () => {
    const source = learner();
    const interactions = source.interactions.map((interaction, index) =>
      index !== 0
        ? interaction
        : {
            ...interaction,
            family: "context_gap_grammar" as const,
            inputMode: "single_choice" as const,
            responseOptions: [
              { responseId: "ready-correct", text: "am" },
              { responseId: "ready-wrong", text: "is" },
            ],
            modePayload: {
              family: "context_gap_grammar" as const,
              localizedScene: localized("I am ready"),
              gappedTargetPhrase: "I ___ ready.",
              gapOptions: [
                { responseId: "ready-correct", text: "am" },
                { responseId: "ready-wrong", text: "is" },
              ],
              testedDimension: "present_be_first_person",
              choiceFeedback: [
                {
                  responseId: "ready-correct",
                  correct: true,
                  feedbackByLocale: localized("Correct"),
                },
                {
                  responseId: "ready-wrong",
                  correct: false,
                  feedbackByLocale: localized("Use am with I"),
                },
              ],
            },
          },
    );
    const value = materializeLearningV2CourseSessionLearnerChildV1({
      courseSessionId: source.courseSessionId,
      targetLanguage: source.targetLanguage,
      interactionProfile: source.interactionProfile,
      interactions,
    });
    const raw = encodeLearningV2CourseSessionLearnerChildV1(value);

    expect(raw).not.toMatch(/"correct":(?:true|false)/u);
    expect(JSON.stringify(value)).not.toMatch(/"correct":(?:true|false)/u);
    expect(
      (value.interactions[0]!.modePayload as any).choiceFeedback,
    ).toEqual([
      expect.objectContaining({ responseId: "ready-correct" }),
      expect.objectContaining({ responseId: "ready-wrong" }),
    ]);
  });

  test("reads legacy pinned learner bytes while exposing a marker-free object", () => {
    const source = learner();
    const value = materializeLearningV2CourseSessionLearnerChildV1({
      courseSessionId: source.courseSessionId,
      targetLanguage: source.targetLanguage,
      interactionProfile: source.interactionProfile,
      interactions: source.interactions.map((interaction, index) =>
        index !== 0
          ? interaction
          : {
              ...interaction,
              family: "context_gap_grammar" as const,
              inputMode: "single_choice" as const,
              responseOptions: [
                { responseId: "legacy-correct", text: "am" },
                { responseId: "legacy-wrong", text: "is" },
              ],
              modePayload: {
                family: "context_gap_grammar" as const,
                localizedScene: localized("I am ready"),
                gappedTargetPhrase: "I ___ ready.",
                gapOptions: [
                  { responseId: "legacy-correct", text: "am" },
                  { responseId: "legacy-wrong", text: "is" },
                ],
                testedDimension: "present_be_first_person",
                choiceFeedback: [
                  {
                    responseId: "legacy-correct",
                    correct: true,
                    feedbackByLocale: localized("Correct"),
                  },
                  {
                    responseId: "legacy-wrong",
                    correct: false,
                    feedbackByLocale: localized("Use am with I"),
                  },
                ],
              },
            },
      ),
    });
    const legacy = JSON.parse(encodeLearningV2CourseSessionLearnerChildV1(value));
    legacy.interactions[0].modePayload.choiceFeedback[0].correct = true;
    legacy.interactions[0].modePayload.choiceFeedback[1].correct = false;
    const { learnerFingerprint: _old, ...legacyBody } = legacy;
    legacy.learnerFingerprint = hashCanonicalBody(legacyBody);
    const legacyRaw = canonicalJsonV1(legacy);

    const parsed = parseLearningV2CourseSessionLearnerChildV1(legacyRaw);
    expect(JSON.stringify(parsed)).not.toMatch(/"correct":(?:true|false)/u);
    expect(parsed.learnerFingerprint).toBe(legacy.learnerFingerprint);
    expect(encodeLearningV2CourseSessionLearnerChildV1(parsed)).toBe(legacyRaw);
  });

  test("keeps only wrong ordered-token feedback across learner materialize and parse", () => {
    const source = learner();
    const interaction = source.interactions[0]!;
    const value = materializeLearningV2CourseSessionLearnerChildV1({
      courseSessionId: source.courseSessionId,
      targetLanguage: source.targetLanguage,
      interactionProfile: source.interactionProfile,
      interactions: source.interactions.map((candidate, index) => index === 0 ? {
          ...interaction,
          family: "phrase_builder",
          inputMode: "ordered_tokens",
          responseOptions: [
            { responseId: "tile-I", text: "I" },
            { responseId: "tile-am", text: "am" },
            { responseId: "tile-is", text: "is" },
          ],
          modePayload: {
            family: "phrase_builder",
            targetPhrase: "I am ready.",
            localizedMeaning: localized("Я готов."),
            orderedTokens: ["I", "am", "ready"],
            authoredDistractorTokens: ["is"],
            slotFeedback: [
              {
                responseId: "tile-I",
                correct: true,
                feedbackByLocale: localized("Correct token"),
              },
              {
                responseId: "tile-is",
                correct: false,
                feedbackByLocale: localized("Use am with I"),
              },
            ],
          },
        } : candidate),
    });

    const raw = encodeLearningV2CourseSessionLearnerChildV1(value);
    const parsed = parseLearningV2CourseSessionLearnerChildV1(raw);
    expect(raw).not.toContain('"correct"');
    expect((value.interactions[0]!.modePayload as any).slotFeedback).toEqual([
      expect.objectContaining({ responseId: "tile-is" }),
    ]);
    expect((parsed.interactions[0]!.modePayload as any).slotFeedback).toEqual([
      expect.objectContaining({ responseId: "tile-is" }),
    ]);
  });

  test("accepts the bounded single-phrase migration ceiling and rejects overflow", () => {
    const makeInteractions = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        interactionId: `migrated-interaction-${index + 1}`,
        ordinal: index + 4,
        purpose: "retrieval_practice" as const,
        family: "scripted_repeat_compare" as const,
        inputMode: "scripted_speech" as const,
        prompt: `Say phrase ${index + 1}`,
        responseOptions: [],
        mediaIds: [],
        audioTargetIds: [],
        accessibilityLabel: `Say phrase ${index + 1}`,
        modePayload: null,
        scriptedAlternate: null,
      }));

    expect(
      materializeLearningV2CourseSessionLearnerChildV1({
        courseSessionId: "lesson-03:session:41",
        targetLanguage: "en-US",
        interactionProfile: "voice_heavy",
        interactions: makeInteractions(32),
      }).interactions,
    ).toHaveLength(32);
    expect(() =>
      materializeLearningV2CourseSessionLearnerChildV1({
        courseSessionId: "lesson-03:session:41",
        targetLanguage: "en-US",
        interactionProfile: "voice_heavy",
        interactions: makeInteractions(33),
      }),
    ).toThrow("learning_v2_course_session_client_child_invalid");
  });

  test("requires report/save/voice and second-error explanation on every interaction", () => {
    const parsed = parseLearningV2CourseSessionAuxiliaryChildV1(
      encodeLearningV2CourseSessionAuxiliaryChildV1(auxiliary()),
    );
    expect(parsed.entries).toHaveLength(16);
    expect(
      parsed.entries.every(
        (entry) =>
          entry.report.available &&
          entry.save.available &&
          entry.voice.tapToRecordAllowed &&
          entry.voice.holdToTalkAllowed,
      ),
    ).toBe(true);
    expect(parsed.firstWrongBehavior).toBe(
      "transparent_shake_not_selected_no_red_frame",
    );
    expect(parsed.secondWrongBehavior).toBe(
      "show_localized_server_approved_explanation",
    );
    expect(
      parsed.entries.every((entry, index) =>
        entry.responseFeedbackById?.[`wrong-${index + 1}`]?.ru.includes(
          `Chosen trap ${index + 1}`,
        ),
      ),
    ).toBe(true);
  });

  test("rejects answer leakage, duplicate intro IDs and action omissions", () => {
    const introRaw = JSON.parse(
      encodeLearningV2CourseSessionIntroChildV1(intro()),
    );
    introRaw.pages[0].question.correctChoiceIndex = 0;
    expect(() =>
      parseLearningV2CourseSessionIntroChildV1(canonicalJsonV1(introRaw)),
    ).toThrow();
    const duplicate = JSON.parse(
      encodeLearningV2CourseSessionIntroChildV1(intro()),
    );
    duplicate.pages[1].question.interactionId =
      duplicate.pages[0].question.interactionId;
    expect(() =>
      parseLearningV2CourseSessionIntroChildV1(canonicalJsonV1(duplicate)),
    ).toThrow();
    const auxRaw = JSON.parse(
      encodeLearningV2CourseSessionAuxiliaryChildV1(auxiliary()),
    );
    delete auxRaw.entries[0].save;
    expect(() =>
      parseLearningV2CourseSessionAuxiliaryChildV1(canonicalJsonV1(auxRaw)),
    ).toThrow();
  });

  test("rejects fixed-12 practice masquerading as a standard 16-interaction session", () => {
    const raw = JSON.parse(
      encodeLearningV2CourseSessionLearnerChildV1(learner()),
    );
    raw.interactions = raw.interactions.slice(0, 9);
    raw.practiceInteractionCount = 9;
    raw.learnerFingerprint = "0".repeat(64);
    expect(() =>
      parseLearningV2CourseSessionLearnerChildV1(canonicalJsonV1(raw)),
    ).toThrow();
  });
});
