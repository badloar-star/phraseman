// зачем: сессия 6 — первая типа words_then_phrases. Главный гейт здесь новый:
// слова обязаны стоять ДО фраз, которые из них собираются. Владелец: «юзер не
// может начать сессию, не ознакомившись со словами — он же не знает их».
import { EPISODE_01_SESSION_06_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_06_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_06_SOURCE);
const plan = EPISODE_01_SESSION_MAP_V1[5];

describe("episode 1 session 6 source", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_06_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_06_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_06_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_06_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_06_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  it("contains none of the banned textbook phrases", () => {
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    for (const phrase of EPISODE_01_SESSION_06_SOURCE.phrases)
      for (const pattern of banned) expect(phrase.english).not.toMatch(pattern);
  });

  it("delivers what the session map promised for slot 6", () => {
    expect(plan.sessionOrdinal).toBe(6);
    expect(plan.kind).toBe("words_then_phrases");
    const features = new Set(
      EPISODE_01_SESSION_06_SOURCE.phrases.flatMap((phrase) => phrase.features),
    );
    for (const promised of plan.teaches) expect(features.has(promised)).toBe(true);
  });

  // зачем: сердце типа words_then_phrases. Одиночные слова идут первыми, и ни
  // одна фраза не смеет содержать слово, которого не было ни в этой сессии, ни
  // раньше.
  it("introduces single words before the phrases built from them", () => {
    const phrases = EPISODE_01_SESSION_06_SOURCE.phrases;
    const singleWordCount = phrases.filter(
      (phrase) => phrase.words.length === 1,
    ).length;
    expect(singleWordCount).toBeGreaterThanOrEqual(3);
    // Все одиночные слова стоят в начале — до первой многословной фразы.
    const firstMultiWord = phrases.findIndex((phrase) => phrase.words.length > 1);
    for (let index = 0; index < firstMultiWord; index += 1)
      expect(phrases[index].words).toHaveLength(1);
    const taughtHere = new Set(
      phrases
        .filter((phrase) => phrase.words.length === 1)
        .map((phrase) => phrase.english.toLowerCase()),
    );
    expect(taughtHere.has("he")).toBe(true);
    expect(taughtHere.has("she")).toBe(true);
    expect(taughtHere.has("it")).toBe(true);
  });

  it("never asks for a construction the intro did not teach", () => {
    const taught = new Set([
      "copula_be",
      "third_person_pronoun",
      "state_adjective",
      "adverb_place",
      "negation_not",
      "question_inversion",
      "indefinite_article",
      "noun_predicate",
      "possessive_my",
    ]);
    for (const phrase of EPISODE_01_SESSION_06_SOURCE.phrases)
      for (const feature of phrase.features)
        expect(taught.has(feature)).toBe(true);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_06_SOURCE.phrases) {
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
