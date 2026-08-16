// зачем: сессия 5 голосовая и построена на активном припоминании — фразы взяты
// из сессий 1–3 намеренно. Гейты проверяют и это: повтор должен быть, но новых
// конструкций появиться не должно.
import { EPISODE_01_SESSION_05_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_05_v1";
import { EPISODE_01_SESSION_01_PHRASES } from "../modules/learning-v2/content/source/episode_01_source_v1";
import { EPISODE_01_SESSION_02_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_02_phrases_v1";
import { EPISODE_01_SESSION_03_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_03_phrases_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_05_SOURCE);
const plan = EPISODE_01_SESSION_MAP_V1[4];

describe("episode 1 session 5 source", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_05_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_05_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_05_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_05_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_05_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  it("contains none of the banned textbook phrases", () => {
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    for (const phrase of EPISODE_01_SESSION_05_SOURCE.phrases)
      for (const pattern of banned) expect(phrase.english).not.toMatch(pattern);
  });

  it("delivers what the session map promised for slot 5", () => {
    expect(plan.sessionOrdinal).toBe(5);
    expect(plan.kind).toBe("voice");
    const features = new Set(
      EPISODE_01_SESSION_05_SOURCE.phrases.flatMap((phrase) => phrase.features),
    );
    for (const promised of plan.teaches) expect(features.has(promised)).toBe(true);
  });

  // зачем: смысл голосовой сессии — говорить, а не учить новое. Если сюда
  // просочилась незнакомая лексика, человек будет одновременно разбирать смысл
  // и ставить произношение, и не справится ни с тем, ни с другим.
  it("reuses earlier phrases instead of introducing new ones", () => {
    const earlier = new Set(
      [
        ...EPISODE_01_SESSION_01_PHRASES,
        ...EPISODE_01_SESSION_02_PHRASES,
        ...EPISODE_01_SESSION_03_PHRASES,
      ].map((phrase) => phrase.english),
    );
    const reused = EPISODE_01_SESSION_05_SOURCE.phrases.filter((phrase) =>
      earlier.has(phrase.english),
    );
    expect(reused.length).toBe(EPISODE_01_SESSION_05_SOURCE.phrases.length);
  });

  it("marks every phrase as spoken production", () => {
    for (const phrase of EPISODE_01_SESSION_05_SOURCE.phrases)
      expect(phrase.features).toContain("spoken_production");
  });

  it("never asks for a construction the intro did not teach", () => {
    const taught = new Set([
      "copula_be",
      "first_person_singular",
      "second_person",
      "state_adjective",
      "adverb_place",
      "adverb_time",
      "negation_not",
      "question_inversion",
      "short_answer",
      "fixed_expression",
      "politeness",
      "greeting",
      "farewell",
      "time_of_day",
      "self_introduction",
      "proper_noun",
      "infinitive_marker",
      "spoken_production",
    ]);
    for (const phrase of EPISODE_01_SESSION_05_SOURCE.phrases)
      for (const feature of phrase.features)
        expect(taught.has(feature)).toBe(true);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_05_SOURCE.phrases) {
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
