// зачем: сессия 4 закрывает пробел, который агент-новичок назвал сам после трёх
// сессий: «не умею спросить, как тебя зовут». Гейты те же плюс сверка с картой.
import { EPISODE_01_SESSION_04_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_04_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_04_SOURCE);
const plan = EPISODE_01_SESSION_MAP_V1[3];

describe("episode 1 session 4 source", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_04_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_04_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_04_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_04_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_04_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  it("contains none of the banned textbook phrases", () => {
    // «What is your name?» — это ВОПРОС и он разрешён; под запретом владельца
    // была фраза-ответ «My name is Anna».
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    for (const phrase of EPISODE_01_SESSION_04_SOURCE.phrases)
      for (const pattern of banned) expect(phrase.english).not.toMatch(pattern);
  });

  it("delivers what the session map promised for slot 4", () => {
    expect(plan.sessionOrdinal).toBe(4);
    expect(plan.kind).toBe("phrases");
    const features = new Set(
      EPISODE_01_SESSION_04_SOURCE.phrases.flatMap((phrase) => phrase.features),
    );
    for (const promised of plan.teaches) expect(features.has(promised)).toBe(true);
  });

  it("never asks for a construction the intro did not teach", () => {
    const taught = new Set([
      // сессии 1–3
      "copula_be",
      "first_person_singular",
      "second_person",
      "state_adjective",
      "negation_not",
      "politeness",
      "preposition_place",
      // введено здесь
      "question_word",
      "third_person_singular",
      "possessive_your",
      "possessive_my",
      "definite_article",
      "quantifier",
      "demonstrative",
      "adverb_time",
    ]);
    for (const phrase of EPISODE_01_SESSION_04_SOURCE.phrases)
      for (const feature of phrase.features)
        expect(taught.has(feature)).toBe(true);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_04_SOURCE.phrases) {
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
