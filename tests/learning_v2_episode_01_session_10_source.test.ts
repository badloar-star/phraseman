// зачем: сессия 10 про принадлежность. Два отдельных гейта закрывают ошибки,
// на которых русскоязычные спотыкаются стабильно: пропущенный апостроф
// (sisters bag вместо sister’s bag) и лишний апостроф там, где его не бывает
// (her’s вместо hers).
import { EPISODE_01_SESSION_10_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_10_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_10_SOURCE);
const plan = EPISODE_01_SESSION_MAP_V1[9];

describe("episode 1 session 10 source", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_10_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_10_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_10_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_10_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_10_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  it("contains none of the banned textbook phrases", () => {
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    for (const phrase of EPISODE_01_SESSION_10_SOURCE.phrases)
      for (const pattern of banned) expect(phrase.english).not.toMatch(pattern);
  });

  it("delivers what the session map promised for slot 10", () => {
    expect(plan.sessionOrdinal).toBe(10);
    expect(plan.kind).toBe("words_then_phrases");
    const features = new Set(
      EPISODE_01_SESSION_10_SOURCE.phrases.flatMap((phrase) => phrase.features),
    );
    for (const promised of plan.teaches) expect(features.has(promised)).toBe(true);
  });

  // зачем: агент-новичок прошёл первую версию этой сессии и поймал подлог —
  // bag, phone и book стояли прямо внутри фраз, хотя сессия 9 их не давала:
  // «их приходится угадывать по переводу». Слова обязаны идти карточками
  // впереди, как sister и brother.
  it("introduces bag, phone and book as their own cards first", () => {
    const phrases = EPISODE_01_SESSION_10_SOURCE.phrases;
    const firstMultiWord = phrases.findIndex((phrase) => phrase.words.length > 1);
    expect(firstMultiWord).toBeGreaterThanOrEqual(3);
    for (let index = 0; index < firstMultiWord; index += 1)
      expect(phrases[index].words).toHaveLength(1);
    const taughtHere = new Set(
      phrases
        .filter((phrase) => phrase.words.length === 1)
        .map((phrase) => phrase.english.toLowerCase()),
    );
    for (const word of ["bag", "phone", "book"])
      expect(taughtHere.has(word)).toBe(true);
  });

  // зачем: без апострофа «sisters bag» читается как «сёстры сумка» — смысл
  // рассыпается. Ошибка обязана стоять рядом с правильным вариантом.
  it("confronts the missing apostrophe", () => {
    const missing = EPISODE_01_SESSION_10_SOURCE.phrases
      .flatMap((phrase) => phrase.words)
      .flatMap((word) => word.distractors)
      .filter(
        (distractor) =>
          distractor.reasonCode === "possessive_apostrophe_missing",
      );
    expect(missing.length).toBeGreaterThanOrEqual(6);
  });

  // зачем: обратная ошибка. Hers, yours, mine апострофа не имеют никогда,
  // но рука дописывает его по аналогии с sister’s.
  it("confronts the apostrophe added where it never belongs", () => {
    const misused = EPISODE_01_SESSION_10_SOURCE.phrases
      .flatMap((phrase) => phrase.words)
      .flatMap((word) => word.distractors)
      .filter((distractor) => distractor.reasonCode === "apostrophe_misuse");
    expect(misused.length).toBeGreaterThanOrEqual(3);
  });

  it("never asks for a construction the intro did not teach", () => {
    const taught = new Set([
      "copula_be",
      "possessive_question",
      "possessive_apostrophe",
      "possessive_standalone",
      "possessive_my",
      "possessive_your",
      "possessive_his_her",
      "demonstrative",
      "third_person_pronoun",
      "family_noun",
      "proper_noun",
      "negation_not",
      "question_inversion",
      "short_answer",
      "everyday_object_noun",
    ]);
    for (const phrase of EPISODE_01_SESSION_10_SOURCE.phrases)
      for (const feature of phrase.features)
        expect(taught.has(feature)).toBe(true);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_10_SOURCE.phrases) {
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
