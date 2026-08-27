import assert from "node:assert/strict";

import { projectLearningV2UnlockedWordsToCardsV1 } from "../app/learning_v2_unlocked_word_cards_v1";

const localized = (prefix: string) => ({
  ru: `${prefix}-ru`,
  uk: `${prefix}-uk`,
  en: `${prefix}-en`,
  es: `${prefix}-es`,
  "pt-BR": `${prefix}-pt`,
  vi: `${prefix}-vi`,
  id: `${prefix}-id`,
  tr: `${prefix}-tr`,
  pl: `${prefix}-pl`,
});

const encounter = (lexicalItemId: string, targetText: string, order: number) => ({
  lexicalItemId,
  transcription: `/${targetText}/`,
  playfulMeaningByLocale: localized(`playful-${targetText}`),
  motionVariant: "premium_a" as const,
  presentation: "blocking_task_overlay" as const,
  dismissal: "continue_only" as const,
  saveControl: "bookmark_icon" as const,
  orderWithinSession: order,
  save: {
    available: true as const,
    savablePhraseRef: `save-${lexicalItemId}`,
    targetLanguage: "en",
    targetText,
    meaningByLocale: localized(`exact-${targetText}`),
    sourceTextFingerprint: "a".repeat(64),
    contentOrigin: "learner_safe_release_projection" as const,
  },
});

const encounters = [
  encounter("word-i", "I", 4),
  encounter("word-am", "am", 5),
  encounter("word-here", "here", 6),
];

const cards = projectLearningV2UnlockedWordsToCardsV1({
  unlocked: [
    {
      targetLanguage: "en",
      lessonOrdinal: 1,
      lexicalItemId: "word-here",
      sourceSessionOrdinal: 1,
      firstEncounteredAt: "2026-08-26T10:02:00.000Z",
      encounter: encounters[2]!,
    },
    {
      targetLanguage: "en",
      lessonOrdinal: 1,
      lexicalItemId: "word-i",
      sourceSessionOrdinal: 1,
      firstEncounteredAt: "2026-08-26T10:00:00.000Z",
      encounter: encounters[0]!,
    },
  ],
});

assert.deepEqual(cards.map((card) => card.en), ["I", "here"]);
assert.equal(cards[0]?.ru, "exact-I-ru");
assert.equal(cards[0]?.uk, "exact-I-uk");
assert.equal(cards[0]?.sourceLocales?.tr, "exact-I-tr");
assert.equal(cards[0]?.transcription, "/I/");
assert.equal(cards[0]?.description, undefined);
assert.ok(
  !JSON.stringify(cards).includes("playful-I"),
  "the playful encounter copy must not leak onto the card back",
);

process.stdout.write("LEARNING V2 UNLOCKED WORD CARDS V1 GATE: PASS\n");
