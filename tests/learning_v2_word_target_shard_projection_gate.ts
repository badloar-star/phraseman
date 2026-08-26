import assert from "node:assert/strict";
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from "../modules/learning-v2/content/source/approved_first_ten_source_v2";
import {
  buildSessionShardFromSource,
  type LocalizedSource,
  type SessionSource,
} from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { evaluateLearningV2SessionContentQuality } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import { EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_01_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";

const localized = (value: string): LocalizedSource => ({
  ru: value,
  uk: value,
  es: value,
  "pt-BR": value,
  vi: value,
  id: value,
  tr: value,
  pl: value,
});

const contact = (target: string, stage: string) => ({
  guidance: localized(`${stage}: ${target}`),
  distractors: [
    {
      value: `${target}-a`,
      reasonCode: `${stage}_${target}_a`,
      trapType: "orthographic",
      feedback: localized(`${target}-a отличается от ${target}`),
    },
    {
      value: `${target}-b`,
      reasonCode: `${stage}_${target}_b`,
      trapType: "semantic_neighbor",
      feedback: localized(`${target}-b отличается от ${target}`),
    },
  ],
});

const vocabulary = ["I", "am", "here", "ready"].map((target, index) => ({
  id: `session-01-word-${index + 1}`,
  target,
  meaning: localized(`meaning:${target}`),
  features: ["lesson1_word_first"],
  contacts: {
    recognize: contact(target, "recognize"),
    retrieve_meaning: contact(target, "retrieve_meaning"),
    build_form: contact(target, "build_form"),
  },
}));

const source = {
  ...APPROVED_FIRST_TEN_SESSION_SOURCES_V2[0],
  sessionKindOverride: "words_then_phrases",
  newVocabulary: vocabulary,
  phrases: APPROVED_FIRST_TEN_SESSION_SOURCES_V2[0]!.phrases.slice(0, 2),
} as unknown as SessionSource;

const shard = buildSessionShardFromSource(source);
assert.equal(shard.cards.length, 20);
assert.deepEqual(
  shard.cards.slice(3, 15).map((card) => card.contentItem.target.text),
  ["I", "am", "here", "ready", "I", "am", "here", "ready", "I", "am", "here", "ready"],
);
assert.ok(
  shard.cards.slice(3, 15).every(
    (card) => !/\s/u.test(card.contentItem.target.text.trim()),
  ),
);
assert.deepEqual(
  [...new Set(shard.cards.slice(15).map((card) => card.contentItem.target.text))],
  ["I am here", "I am ready"],
);
assert.ok(
  shard.cards.slice(3, 15).every((card) => card.contentItem.rejectedAnswers.length === 2),
);

const realShard = buildSessionShardFromSource(EPISODE_01_SESSION_01_SOURCE);
assert.doesNotThrow(() =>
  validateLearningV2GeneratedSessionShardV1(realShard, {
    packageId: realShard.packageId,
    targetLanguage: realShard.targetLanguage,
    episodeOrdinal: realShard.episodeOrdinal,
    requiredSessionOrdinal: realShard.requiredSessionOrdinal,
    generationInputFingerprint: realShard.generationInputFingerprint,
  }),
  "A valid word-first shard must survive the same validator used by publication",
);

const learner = buildSessionChildBodiesFromShard(
  realShard,
  "ru",
  "lesson-01:session:01",
).learner as {
  interactions: readonly {
    interactionId: string;
    responseOptions: readonly { text: string }[];
  }[];
};
assert.deepEqual(
  learner.interactions[0]?.responseOptions.map((option) => option.text),
  ["I", "A", "E", "Y"],
  "A vocabulary listening contact must show the manually authored sound traps, not meanings from unrelated cards",
);

const conciseManualSource = {
  ...source,
  phrases: source.phrases.map((phrase) => ({
    ...phrase,
    words: phrase.words.map((word) => ({
      ...word,
      distractors: word.distractors.slice(0, 2),
    })),
  })),
} as SessionSource;
const conciseManualReport = evaluateLearningV2SessionContentQuality(
  conciseManualSource,
);
assert.ok(
  !conciseManualReport.issues.some((issue) => issue.code === "phrase_count_invalid"),
  "Word-first sessions use interactions, not a forced inventory of 15 phrases",
);
assert.ok(
  !conciseManualReport.issues.some((issue) => issue.code === "phrase_distractors_invalid"),
  "Two close wrong choices are sufficient for a three-option task",
);

const brokenVocabularySource = {
  ...source,
  newVocabulary: [
    {
      ...vocabulary[0],
      contacts: {
        ...vocabulary[0]!.contacts,
        recognize: {
          ...vocabulary[0]!.contacts.recognize,
          distractors: [],
        },
      },
    },
  ],
} as unknown as SessionSource;
const brokenVocabularyReport = evaluateLearningV2SessionContentQuality(
  brokenVocabularySource,
);
assert.ok(
  brokenVocabularyReport.issues.some(
    (issue) => issue.code === "vocabulary_distractors_invalid",
  ),
  "The strict content gate must reject a word contact without two diagnostic traps",
);

process.stdout.write("LEARNING V2 WORD TARGET SHARD PROJECTION GATE: PASS\n");
