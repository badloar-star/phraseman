// зачем: сессия 7 закрывает таблицу to be. Отдельный гейт следит за самой
// частой ошибкой русскоязычных — приписыванием s к слову-признаку («они заняты»
// → busies). Такой вариант обязан быть среди дистракторов, иначе человек
// никогда не столкнётся со своей ошибкой в безопасной обстановке.
import { EPISODE_01_SESSION_07_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_07_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_07_SOURCE);
const plan = EPISODE_01_SESSION_MAP_V1[6];

describe("episode 1 session 7 source", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_07_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_07_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_07_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_07_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_07_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  it("contains none of the banned textbook phrases", () => {
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    for (const phrase of EPISODE_01_SESSION_07_SOURCE.phrases)
      for (const pattern of banned) expect(phrase.english).not.toMatch(pattern);
  });

  it("delivers what the session map promised for slot 7", () => {
    expect(plan.sessionOrdinal).toBe(7);
    expect(plan.kind).toBe("words_then_phrases");
    const features = new Set(
      EPISODE_01_SESSION_07_SOURCE.phrases.flatMap((phrase) => phrase.features),
    );
    for (const promised of plan.teaches) expect(features.has(promised)).toBe(true);
  });

  it("introduces single words before the phrases built from them", () => {
    const phrases = EPISODE_01_SESSION_07_SOURCE.phrases;
    const firstMultiWord = phrases.findIndex((phrase) => phrase.words.length > 1);
    expect(firstMultiWord).toBeGreaterThanOrEqual(3);
    for (let index = 0; index < firstMultiWord; index += 1)
      expect(phrases[index].words).toHaveLength(1);
    const taughtHere = new Set(
      phrases
        .filter((phrase) => phrase.words.length === 1)
        .map((phrase) => phrase.english.toLowerCase()),
    );
    expect(taughtHere.has("we")).toBe(true);
    expect(taughtHere.has("they")).toBe(true);
  });

  // зачем: главная ошибка переноса из русского — «они заняты» превращается в
  // busies. Пока такой вариант не стоит рядом с правильным, человек её не
  // заметит.
  it("confronts the pluralised-adjective mistake head on", () => {
    const pluralisedAdjective = EPISODE_01_SESSION_07_SOURCE.phrases
      .flatMap((phrase) => phrase.words)
      .flatMap((word) => word.distractors)
      .filter((distractor) => distractor.reasonCode === "adjective_pluralized");
    expect(pluralisedAdjective.length).toBeGreaterThanOrEqual(3);
  });

  it("never asks for a construction the intro did not teach", () => {
    const taught = new Set([
      "copula_be",
      "plural_pronoun",
      "plural_noun",
      "state_adjective",
      "adverb_place",
      "adverb_time",
      "negation_not",
      "question_inversion",
      "noun_predicate",
      "possessive_my",
    ]);
    for (const phrase of EPISODE_01_SESSION_07_SOURCE.phrases)
      for (const feature of phrase.features)
        expect(taught.has(feature)).toBe(true);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_07_SOURCE.phrases) {
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
