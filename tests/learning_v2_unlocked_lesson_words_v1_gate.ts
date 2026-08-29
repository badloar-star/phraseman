import assert from "node:assert/strict";

import {
  learningV2AuthoringPreviewUnlockedLessonWordsKeyV1,
  learningV2UnlockedLessonWordsKeyV1,
  mergeLearningV2UnlockedLessonWordListsV1,
  mergeLearningV2UnlockedLessonWordV1,
  parseLearningV2UnlockedLessonWordsV1,
} from "../app/learning_v2_unlocked_lesson_words_v1";

const localized = (value: string) => ({
  ru: value,
  uk: value,
  es: value,
  en: value,
  "pt-BR": value,
  vi: value,
  id: value,
  tr: value,
  pl: value,
});

const first = {
  targetLanguage: "en",
  lessonOrdinal: 1,
  lexicalItemId: "e01-s01-word-here",
  sourceSessionOrdinal: 1,
  firstEncounteredAt: "2026-08-26T10:00:00.000Z",
  encounter: {
    lexicalItemId: "e01-s01-word-here",
    transcription: "/hɪr/",
    playfulMeaningByLocale: localized("Рядом, а не где-то за горизонтом."),
    motionVariant: "premium_a" as const,
    presentation: "blocking_task_overlay" as const,
    dismissal: "continue_only" as const,
    saveControl: "bookmark_icon" as const,
    orderWithinSession: 4,
    save: {
      available: true as const,
      savablePhraseRef: "save-here",
      targetLanguage: "en",
      targetText: "here",
      meaningByLocale: localized("здесь"),
      sourceTextFingerprint: "a".repeat(64),
      contentOrigin: "learner_safe_release_projection" as const,
    },
  },
} as const;

assert.equal(
  learningV2UnlockedLessonWordsKeyV1("en", 1),
  "learning-v2:unlocked-words:v1:en:lesson:1",
);
assert.equal(
  learningV2AuthoringPreviewUnlockedLessonWordsKeyV1("en", 1),
  "learning-v2:authoring-preview-unlocked-words:v1:en:lesson:1",
  "authoring preview must never write the learner unlock key",
);

const once = mergeLearningV2UnlockedLessonWordV1([], first);
const twice = mergeLearningV2UnlockedLessonWordV1(once, {
  ...first,
  firstEncounteredAt: "2026-08-26T11:00:00.000Z",
});
assert.equal(twice.length, 1, "a repeated encounter must remain idempotent");
assert.equal(
  twice[0]?.firstEncounteredAt,
  first.firstEncounteredAt,
  "the first encounter timestamp must be preserved",
);
assert.equal(twice[0]?.encounter.save.targetText, "here");

const otherTarget = mergeLearningV2UnlockedLessonWordV1(twice, {
  ...first,
  targetLanguage: "es",
  encounter: {
    ...first.encounter,
    save: { ...first.encounter.save, targetLanguage: "es" },
  },
});
assert.equal(otherTarget.length, 2, "target-language identity must be isolated");

const visible = mergeLearningV2UnlockedLessonWordListsV1(
  once,
  [{ ...first, firstEncounteredAt: "2026-08-26T11:00:00.000Z" }],
);
assert.equal(visible.length, 1, "learner and preview rows must merge idempotently");
assert.equal(
  visible[0]?.firstEncounteredAt,
  first.firstEncounteredAt,
  "visible dictionary merge must preserve the earliest real encounter",
);

assert.deepEqual(parseLearningV2UnlockedLessonWordsV1("not-json"), []);
const { encounter: _missingEncounter, ...withoutEncounter } = first;
assert.deepEqual(
  parseLearningV2UnlockedLessonWordsV1(JSON.stringify([withoutEncounter])),
  [],
  "a durable unlocked row must carry its learner-safe encounter snapshot",
);
assert.deepEqual(
  parseLearningV2UnlockedLessonWordsV1(
    JSON.stringify([{ ...first, lexicalItemId: "" }]),
  ),
  [],
);

assert.throws(
  () => learningV2UnlockedLessonWordsKeyV1("en", 0),
  /learning_v2_unlocked_lesson_words_invalid/,
);

process.stdout.write("LEARNING V2 UNLOCKED LESSON WORDS V1 GATE: PASS\n");
