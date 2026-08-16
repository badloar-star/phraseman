// зачем: сессия 3 добавляет вопрос и второе лицо — то, чего агент-новичок не
// смог сделать после двух сессий («умею говорить о себе, но не умею спросить»).
import { EPISODE_01_SESSION_03_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_03_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_03_SOURCE);

describe("episode 1 session 3 source", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_03_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_03_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_03_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_03_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_03_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  it("contains none of the banned textbook phrases", () => {
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    for (const phrase of EPISODE_01_SESSION_03_SOURCE.phrases)
      for (const pattern of banned) expect(phrase.english).not.toMatch(pattern);
  });

  it("never asks for a construction the intro did not teach", () => {
    const taught = new Set([
      // из сессии 1
      "copula_be",
      "first_person_singular",
      "state_adjective",
      "adverb_place",
      "negation_not",
      // введено здесь
      "second_person",
      "question_inversion",
      "short_answer",
      "turn_taking",
      "fixed_expression",
    ]);
    for (const phrase of EPISODE_01_SESSION_03_SOURCE.phrases)
      for (const feature of phrase.features)
        expect(taught.has(feature)).toBe(true);
  });

  // зачем: смысл сессии — научить спрашивать. Если вопросов нет, она провалена
  // по назначению, даже когда валидатор доволен.
  it("actually teaches asking, not just more statements", () => {
    const questions = EPISODE_01_SESSION_03_SOURCE.phrases.filter((phrase) =>
      phrase.english.endsWith("?"),
    );
    expect(questions.length).toBeGreaterThanOrEqual(3);
    const shortAnswers = EPISODE_01_SESSION_03_SOURCE.phrases.filter((phrase) =>
      phrase.features.includes("short_answer"),
    );
    expect(shortAnswers.length).toBeGreaterThanOrEqual(2);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_03_SOURCE.phrases) {
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
