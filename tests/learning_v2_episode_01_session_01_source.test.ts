// зачем: контент урока 1 обязан проходить ТОТ ЖЕ валидатор, что и генератор.
// Если сессия собрана неправильно, тест падает здесь, а не в приложении у ученика.
import { EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_01_v1";
import {
  buildSessionShardFromSource,
  UNTRANSLATED_MARKER,
} from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_01_SOURCE);

describe("episode 1 session 1 source", () => {
  it("passes the real generator shard validator", () => {
    expect(() =>
      validateLearningV2GeneratedSessionShardV1(shard, {
        packageId: EPISODE_01_SESSION_01_SOURCE.packageId,
        targetLanguage: EPISODE_01_SESSION_01_SOURCE.targetLanguage,
        episodeOrdinal: EPISODE_01_SESSION_01_SOURCE.episodeOrdinal,
        requiredSessionOrdinal:
          EPISODE_01_SESSION_01_SOURCE.requiredSessionOrdinal,
        generationInputFingerprint:
          EPISODE_01_SESSION_01_SOURCE.generationInputFingerprint,
      }),
    ).not.toThrow();
  });

  // зачем: владелец запретил эти формулировки лично. Гейт держит запрет на весь курс.
  it("contains none of the banned textbook phrases", () => {
    const banned = [/\bI am from [A-Z]/, /My name is /i, /How do you do/i];
    const english = EPISODE_01_SESSION_01_SOURCE.phrases.map((p) => p.english);
    for (const phrase of english)
      for (const pattern of banned) expect(phrase).not.toMatch(pattern);
  });

  it("gives every phrase an explanation and reasoned distractors", () => {
    for (const phrase of EPISODE_01_SESSION_01_SOURCE.phrases) {
      expect(phrase.explanation.length).toBeGreaterThan(40);
      expect(phrase.words.length).toBeGreaterThan(0);
      for (const word of phrase.words) {
        expect(word.distractors).toHaveLength(5);
        for (const distractor of word.distractors) {
          expect(distractor.reasonCode).toMatch(/^[a-z0-9_]+$/);
          expect(distractor.why.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it("teaches the intro before practice asks for it", () => {
    expect(shard.intro.pages).toHaveLength(3);
    expect(shard.intro.practiceStartSlot).toBe(4);
    for (let index = 0; index < 3; index += 1)
      expect(shard.cards[index].introQuestionId).toBe(
        shard.intro.pages[index].question.questionId,
      );
    for (let index = 3; index < 12; index += 1)
      expect(shard.cards[index].introQuestionId).toBeNull();
  });

  // зачем: агент-новичок прошёл первую версию сессии и нашёл дыру — 6 из 12
  // карточек требовали приветствий и артикля, которых интро не объясняло, и
  // правило приходило в подсказке уже ПОСЛЕ ответа. Этот гейт держит границу:
  // сессия не смеет требовать конструкцию, которой интро не научило.
  it("never asks for a construction the intro did not teach", () => {
    const taughtFeatures = new Set([
      "copula_be",
      "first_person_singular",
      "state_adjective",
      "adverb_place",
      "adjective_predicate",
      "negation_not",
    ]);
    for (const phrase of EPISODE_01_SESSION_01_SOURCE.phrases)
      for (const feature of phrase.features)
        expect(taughtFeatures.has(feature)).toBe(true);
  });

  // зачем: честность важнее зелёного теста — непереведённые локали должны быть
  // видимы, а не притворяться готовыми.
  it("marks locales that still need a human translation", () => {
    const untranslated = new Set<string>();
    for (const card of shard.cards)
      for (const [locale, text] of Object.entries(card.hintByLocale))
        if (text.startsWith(UNTRANSLATED_MARKER)) untranslated.add(locale);
    expect([...untranslated].sort()).toEqual([
      "id",
      "pl",
      "pt-BR",
      "tr",
      "vi",
    ]);
  });
});
