import assert from "node:assert/strict";

import {
  LEARNING_V2_ACTIVE_MODE_FAMILIES_V2,
  assertLearningV2CurriculumSessionPacketV2,
  type LearningV2CurriculumSessionPacketV2,
  type LearningV2PracticeInteractionV2,
} from "../modules/learning-v2/curriculum/contracts/course_blueprint_v2";

const localized = (text: string) => Object.freeze({
  ru: text,
  uk: text,
  es: text,
  "pt-BR": text,
  vi: text,
  id: text,
  tr: text,
  pl: text,
});

const audio = Object.freeze({
  audioAssetId: "audio.en.i_am_ready.v1",
  preloadBeforeSession: true as const,
  replayEnabled: true as const,
  autoplayOnEntry: false,
});

const motion = Object.freeze({
  blocksInteraction: false as const,
  reducedMotionPreservesMeaning: true as const,
});

const choices = Object.freeze([
  Object.freeze({ optionId: "ready", text: "ready", isCorrect: true, diagnosticErrorId: null, feedbackByLocale: null }),
  Object.freeze({ optionId: "read", text: "read", isCorrect: false, diagnosticErrorId: "wrong_lexeme_read", feedbackByLocale: localized("Это другое слово.") }),
  Object.freeze({ optionId: "reading", text: "reading", isCorrect: false, diagnosticErrorId: "wrong_form_ing", feedbackByLocale: localized("Здесь нужна форма ready.") }),
  Object.freeze({ optionId: "already", text: "already", isCorrect: false, diagnosticErrorId: "wrong_adverb", feedbackByLocale: localized("Это наречие, а не нужное состояние.") }),
]);

const MODES = LEARNING_V2_ACTIVE_MODE_FAMILIES_V2;

function practice(index: number): LearningV2PracticeInteractionV2 {
  const slot = index + 4;
  const modeFamily = MODES[index % MODES.length];
  const common = {
    activityId: `lesson-01:session:01:activity:${String(slot).padStart(2, "0")}`,
    slot,
    modeFamily,
    targetSignature: `i-am-ready-${slot}`,
    targetOperationIds: Object.freeze(["en.be.present.affirmative.i_am"]),
    targetLexicalSenseIds: Object.freeze(["en.ready.adjective.01"]),
    support: index < 5 ? "high" as const : index < 12 ? "medium" as const : "low" as const,
    independentEvidence: index === 16,
    scored: index >= 2,
    motion,
  };

  switch (modeFamily) {
    case "phrase_builder":
      return Object.freeze({
        ...common,
        modePayload: Object.freeze({
          family: modeFamily,
          targetPhrase: "I am ready.",
          meaningByLocale: localized("Я готов."),
          tiles: Object.freeze([
            Object.freeze({ tileId: "i", text: "I", kind: "word" as const, correctOrdinal: 0 }),
            Object.freeze({ tileId: "am", text: "am", kind: "word" as const, correctOrdinal: 1 }),
            Object.freeze({ tileId: "ready", text: "ready", kind: "word" as const, correctOrdinal: 2 }),
          ]),
        }),
      });
    case "listen_choose":
      return Object.freeze({
        ...common,
        modePayload: Object.freeze({
          family: modeFamily,
          audio,
          targetTextHiddenUntilAttempt: true as const,
          options: choices,
        }),
      });
    case "listen_build_dictation":
      return Object.freeze({
        ...common,
        modePayload: Object.freeze({
          family: modeFamily,
          audio,
          targetPhrase: "I am ready.",
          targetHiddenUntilAttempt: true as const,
          tiles: Object.freeze([
            Object.freeze({ tileId: "i", text: "I", kind: "word" as const, correctOrdinal: 0 }),
            Object.freeze({ tileId: "am", text: "am", kind: "word" as const, correctOrdinal: 1 }),
            Object.freeze({ tileId: "ready", text: "ready", kind: "word" as const, correctOrdinal: 2 }),
          ]),
        }),
      });
    case "context_gap_grammar":
      return Object.freeze({
        ...common,
        modePayload: Object.freeze({
          family: modeFamily,
          sceneByLocale: localized("Говорящий сообщает о себе."),
          phraseWithGap: "I ___ ready.",
          options: choices,
        }),
      });
    case "speed_match":
      return Object.freeze({
        ...common,
        modePayload: Object.freeze({
          family: modeFamily,
          pairs: Object.freeze(["ready", "here", "fine", "tired"].map((word) => Object.freeze({
            pairId: word,
            targetSenseId: `en.${word}.sense.01`,
            targetText: word,
            meaningByLocale: localized(word),
          }))),
        }),
      });
    case "scripted_repeat_compare":
      return Object.freeze({
        ...common,
        modePayload: Object.freeze({
          family: modeFamily,
          audio,
          targetPhrase: "I am ready.",
          speech: Object.freeze({
            interaction: "hold_press_release" as const,
            releaseEndsCapture: true as const,
            ownerPreviewSkipEnabled: true as const,
            accessibilityEquivalentEnabled: true as const,
            singleMeasurementIsSoleGate: false as const,
          }),
        }),
      });
  }
}

const VALID_PACKET: LearningV2CurriculumSessionPacketV2 = Object.freeze({
  sessionId: "lesson-01:session:01",
  lessonOrdinal: 1,
  chapterOrdinal: 1,
  sessionOrdinal: 1,
  role: "introduce_grammar",
  grammarOperationIds: Object.freeze(["en.be.present.affirmative.i_am"]),
  reviewOperationIds: Object.freeze([]),
  primaryCanDoStep: "Сообщить одну информацию о себе через I am.",
  prerequisiteSessionIds: Object.freeze([]),
  newLexicalSenseIds: Object.freeze(["en.ready.adjective.01"]),
  retrievalLexicalSenseIds: Object.freeze([]),
  introInteractions: Object.freeze([
    Object.freeze({ slot: 1, purpose: "meaning", operationIds: Object.freeze(["en.be.present.affirmative.i_am"]), checkActivityId: "lesson-01:session:01:intro:01", testedDimension: "communicative_meaning", testLanguage: "target" as const }),
    Object.freeze({ slot: 2, purpose: "form", operationIds: Object.freeze(["en.be.present.affirmative.i_am"]), checkActivityId: "lesson-01:session:01:intro:02", testedDimension: "subject_auxiliary_agreement", testLanguage: "target" as const }),
    Object.freeze({ slot: 3, purpose: "diagnostic_trap", operationIds: Object.freeze(["en.be.present.affirmative.i_am"]), checkActivityId: "lesson-01:session:01:intro:03", testedDimension: "am_vs_is_are", testLanguage: "target" as const }),
  ]),
  practiceInteractions: Object.freeze(Array.from({ length: 17 }, (_, index) => practice(index))),
  sourceEvidenceRefs: Object.freeze(["EV-CEFR-B1-GRAMMAR-01"]),
});

function expectCode(packet: unknown, code: string): void {
  assert.throws(
    () => assertLearningV2CurriculumSessionPacketV2(packet),
    (error: unknown) => error instanceof Error && error.message === code,
    code,
  );
}

assert.deepEqual(MODES, [
  "phrase_builder",
  "listen_choose",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
]);
assert.doesNotThrow(() => assertLearningV2CurriculumSessionPacketV2(VALID_PACKET));

expectCode(
  { ...VALID_PACKET, introInteractions: VALID_PACKET.introInteractions.slice(0, 2) },
  "learning_v2_v2_intro_count_invalid",
);
expectCode(
  { ...VALID_PACKET, practiceInteractions: VALID_PACKET.practiceInteractions.slice(0, 16) },
  "learning_v2_v2_practice_count_invalid",
);
expectCode(
  { ...VALID_PACKET, grammarOperationIds: Object.freeze([]), reviewOperationIds: Object.freeze([]) },
  "learning_v2_v2_grammar_or_review_required",
);
expectCode(
  { ...VALID_PACKET, grammarOperationIds: Object.freeze(["en.be.present.affirmative.i_am"]), reviewOperationIds: Object.freeze(["en.be.present.affirmative.i_am"]) },
  "learning_v2_v2_grammar_and_review_conflict",
);
expectCode(
  { ...VALID_PACKET, introInteractions: Object.freeze(VALID_PACKET.introInteractions.map((intro, index) => index === 0 ? Object.freeze({ ...intro, testLanguage: "interface" }) : intro)) },
  "learning_v2_v2_intro_interface_language_test_forbidden",
);

process.stdout.write("LEARNING V2 COURSE BLUEPRINT V2 CONTRACT GATE: PASS\n");
