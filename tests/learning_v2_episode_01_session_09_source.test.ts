// зачем: сессия 9 открывает главу 2. Отдельный гейт здесь — на выбор his / her
// по ХОЗЯИНУ, а не по предмету: «его сестра» это his sister, и русскоязычные
// стабильно ставят her, потому что сестра женщина.
import { EPISODE_01_SESSION_09_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_09_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_09_SOURCE);
const plan = EPISODE_01_SESSION_MAP_V1[8];

describe("episode 1 session 9 source", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_09_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_09_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_09_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_09_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_09_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  it("contains none of the banned textbook phrases", () => {
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    for (const phrase of EPISODE_01_SESSION_09_SOURCE.phrases)
      for (const pattern of banned) expect(phrase.english).not.toMatch(pattern);
  });

  it("delivers what the session map promised for slot 9", () => {
    expect(plan.sessionOrdinal).toBe(9);
    expect(plan.kind).toBe("words_then_phrases");
    const features = new Set(
      EPISODE_01_SESSION_09_SOURCE.phrases.flatMap((phrase) => phrase.features),
    );
    for (const promised of plan.teaches) expect(features.has(promised)).toBe(true);
  });

  it("introduces single words before the phrases built from them", () => {
    const phrases = EPISODE_01_SESSION_09_SOURCE.phrases;
    const firstMultiWord = phrases.findIndex((phrase) => phrase.words.length > 1);
    expect(firstMultiWord).toBeGreaterThanOrEqual(4);
    for (let index = 0; index < firstMultiWord; index += 1)
      expect(phrases[index].words).toHaveLength(1);
    const taughtHere = new Set(
      phrases
        .filter((phrase) => phrase.words.length === 1)
        .map((phrase) => phrase.english.toLowerCase()),
    );
    for (const word of ["sister", "brother", "his", "her"])
      expect(taughtHere.has(word)).toBe(true);
  });

  // зачем: «его сестра» → his sister. Русскоязычные ставят her, потому что
  // сестра женщина; выбор идёт по хозяину. Пока неверный вариант не стоит
  // рядом с правильным, человек эту ошибку не встретит.
  it("confronts the his-or-her-by-owner mistake", () => {
    const genderSwaps = EPISODE_01_SESSION_09_SOURCE.phrases
      .flatMap((phrase) => phrase.words)
      .flatMap((word) => word.distractors)
      .filter((distractor) => distractor.reasonCode === "gender_mismatch");
    expect(genderSwaps.length).toBeGreaterThanOrEqual(4);
  });

  it("never asks for a construction the intro did not teach", () => {
    const taught = new Set([
      "copula_be",
      "family_noun",
      "possessive_his_her",
      "possessive_my",
      "possessive_your",
      "third_person_pronoun",
      "demonstrative",
      "noun_predicate",
      "proper_noun",
      "indefinite_article",
      "question_inversion",
      "adverb_place",
    ]);
    for (const phrase of EPISODE_01_SESSION_09_SOURCE.phrases)
      for (const feature of phrase.features)
        expect(taught.has(feature)).toBe(true);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_09_SOURCE.phrases) {
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
