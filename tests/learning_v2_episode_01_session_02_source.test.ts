// зачем: сессия 2 собрана из того, что агент-новичок не смог пройти в сессии 1.
// Те же гейты: настоящий валидатор, запреты владельца, «учим до того, как спросим».
import { EPISODE_01_SESSION_02_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_02_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_02_SOURCE);

describe("episode 1 session 2 source", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_02_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_02_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_02_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_02_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_02_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  it("contains none of the banned textbook phrases", () => {
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    for (const phrase of EPISODE_01_SESSION_02_SOURCE.phrases)
      for (const pattern of banned) expect(phrase.english).not.toMatch(pattern);
  });

  it("never asks for a construction the intro did not teach", () => {
    // Интро сессии 2 объясняет: готовые формулы, представление через связку,
    // город через live in, артикль перед профессией. Плюс всё из сессии 1.
    const taught = new Set([
      "fixed_expression",
      "politeness",
      "greeting",
      "farewell",
      "time_of_day",
      // later объяснено на первой странице интро («позже» → «увидимся позже»)
      "adverb_time",
      "single_word_utterance",
      "copula_be",
      "first_person_singular",
      "self_introduction",
      "proper_noun",
      "indefinite_article",
      "noun_predicate",
      "present_simple_verb",
      "preposition_place",
      "infinitive_marker",
    ]);
    for (const phrase of EPISODE_01_SESSION_02_SOURCE.phrases)
      for (const feature of phrase.features)
        expect(taught.has(feature)).toBe(true);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_02_SOURCE.phrases) {
      expect(phrase.explanation.length).toBeGreaterThan(40);
      for (const word of phrase.words) {
        expect(word.distractors).toHaveLength(5);
        for (const distractor of word.distractors) {
          expect(distractor.reasonCode).toMatch(/^[a-z0-9_]+$/);
          expect(distractor.why.length).toBeGreaterThan(10);
        }
      }
    }
  });
});
