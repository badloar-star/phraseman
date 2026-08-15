import {
  encodeLearningV2CourseSessionAuxiliaryChildV1,
  encodeLearningV2CourseSessionIntroChildV1,
  encodeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionIntroChildV1,
  materializeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionSavablePhraseV1,
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
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
