// зачем: сессия 8 — чекпоинт. Главный гейт здесь обратный обычному: он следит,
// чтобы в сессии НЕ появилось ничего нового. Граница главы существует, чтобы
// собрать пройденное; любая новая конструкция превращает проверку в урок и
// портит замер.
import { EPISODE_01_SESSION_08_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_08_v1";
import { EPISODE_01_SESSION_01_PHRASES } from "../modules/learning-v2/content/source/episode_01_source_v1";
import { EPISODE_01_SESSION_02_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_02_phrases_v1";
import { EPISODE_01_SESSION_03_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_03_phrases_v1";
import { EPISODE_01_SESSION_04_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_04_phrases_v1";
import { EPISODE_01_SESSION_05_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_05_phrases_v1";
import { EPISODE_01_SESSION_06_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_06_phrases_v1";
import { EPISODE_01_SESSION_07_PHRASES } from "../modules/learning-v2/content/source/episode_01_session_07_phrases_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { EPISODE_01_SESSION_MAP_V1 } from "../modules/learning-v2/content/source/episode_01_session_map_v1";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_08_SOURCE);
const plan = EPISODE_01_SESSION_MAP_V1[7];

const EARLIER = [
  EPISODE_01_SESSION_01_PHRASES,
  EPISODE_01_SESSION_02_PHRASES,
  EPISODE_01_SESSION_03_PHRASES,
  EPISODE_01_SESSION_04_PHRASES,
  EPISODE_01_SESSION_05_PHRASES,
  EPISODE_01_SESSION_06_PHRASES,
  EPISODE_01_SESSION_07_PHRASES,
].flat();

describe("episode 1 session 8 checkpoint", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_08_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_08_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_08_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_08_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_08_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  it("contains none of the banned textbook phrases", () => {
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    for (const phrase of EPISODE_01_SESSION_08_SOURCE.phrases)
      for (const pattern of banned) expect(phrase.english).not.toMatch(pattern);
  });

  it("sits where the map says a chapter boundary belongs", () => {
    expect(plan.sessionOrdinal).toBe(8);
    expect(plan.kind).toBe("checkpoint");
    // Чекпоинт ничему не учит — в карте у него пустой список.
    expect(plan.teaches).toEqual([]);
  });

  // зачем: сердце чекпоинта. Каждая конструкция обязана быть знакомой, иначе
  // человек проваливает границу главы не потому, что забыл, а потому, что
  // столкнулся с новым.
  it("introduces no construction the learner has not already met", () => {
    const met = new Set(EARLIER.flatMap((phrase) => phrase.features));
    const fresh = new Set<string>();
    for (const phrase of EPISODE_01_SESSION_08_SOURCE.phrases)
      for (const feature of phrase.features)
        if (!met.has(feature)) fresh.add(feature);
    expect([...fresh]).toEqual([]);
  });

  // зачем: если фразы идут однотипной кучей, человек решает их по инерции, не
  // переключаясь. Настоящий разговор так не устроен.
  it("mixes persons instead of drilling one at a time", () => {
    const persons = EPISODE_01_SESSION_08_SOURCE.phrases.map((phrase) => {
      if (phrase.features.includes("plural_pronoun")) return "plural";
      if (phrase.features.includes("third_person_pronoun")) return "third";
      if (phrase.features.includes("second_person")) return "second";
      return "first";
    });
    expect(new Set(persons).size).toBeGreaterThanOrEqual(4);
    // Ни одно лицо не идёт три раза подряд.
    for (let index = 2; index < persons.length; index += 1)
      expect(
        persons[index] === persons[index - 1] &&
          persons[index] === persons[index - 2],
      ).toBe(false);
  });

  it("covers negation, question and statement in one sitting", () => {
    const features = new Set(
      EPISODE_01_SESSION_08_SOURCE.phrases.flatMap((phrase) => phrase.features),
    );
    for (const required of [
      "negation_not",
      "question_inversion",
      "question_word",
      "indefinite_article",
      "plural_pronoun",
      "third_person_pronoun",
    ])
      expect(features.has(required)).toBe(true);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_08_SOURCE.phrases) {
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
