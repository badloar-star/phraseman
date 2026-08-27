import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_14_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_14_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_14_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_14_WORD_FIRST_TITLE,
} from './es_episode_01_session_14_intro_v1';
import { ES_EPISODE_01_SESSION_14_PHRASES } from './es_episode_01_session_14_phrases_v1';
import { ES_EPISODE_01_SESSION_14_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_14_mode_native_v1';
import { LESSON1_ES_SESSION_14_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 14 «Согласен или
 * нет» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 14,
 * kind: 'phrases' (переопределено с исходного words_then_phrases — см.
 * ниже), teaches: ['agreement_phrase'], builtOn: [5, 10], recalls: [5, 10].
 *
 * de acuerdo вводится НЕ через newVocabulary (word-first), а прямо во
 * фразах как обычные позиционные токены De/de + acuerdo. Причина: word-first
 * vocabulary в этом курсе поддерживает только ОДНОСЛОВНЫЕ target —
 * подтверждено research-агентом по трём независимым местам общей
 * инфраструктуры (task_specific_distractors_v1.ts сравнивает по
 * последнему токену фразы через reasonCode-парсинг; session_shard_from_source_v1.ts
 * переписывает reasonCode на весь targetText для vocabulary-контактов, что
 * ломает сравнение при多словном target; lesson1_session_choreography_v1.ts
 * в inferLesson1WordFirstVocabularyCountV1 явно требует "!/\s/u.test(target)").
 * "de acuerdo" — двухсловная формула, первая попытка (newVocabulary) упала
 * с task_specific_distractors_insufficient при сборке мока.
 *
 * Без newVocabulary source требует ровно 15 фраз (не 1-15) — все 15
 * написаны. distractorAuthorship: 'manual' снижает минимум дистракторов
 * с 3 до 2.
 *
 * зачем sessionKindOverride: 'phrases' ОБЯЗАТЕЛЕН (владелец, 2026-08-25,
 * найдено при аудите после сессии 17): lesson1SessionChoreographyV1 без
 * явного override молча берёт kind из АНГЛИЙСКОЙ карты
 * EPISODE_01_SESSION_MAP_V1 по тому же номеру сессии. Английская сессия 14 —
 * 'words_then_phrases' («Где я и где ты»), и без override это давало
 * practiceSteps('words_then_phrases') → legacyWordsThenPhrasesSteps() —
 * ровно 5 УНИКАЛЬНЫХ фраз (sourcePhraseIndex 0-4) на 17 карточек, вместо
 * всех 15 написанных. 10 из 15 фраз (включая Es igual, Somos de acuerdo,
 * No somos de acuerdo и все gender/negation-варианты) молча никогда не
 * показывались ученику. С override сборка использует phraseSteps() и все
 * 15 фраз.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-27,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт должен
 * быть реальным действием внутри одной из шести утверждённых механик.
 * es_episode_01_session_14_mode_native_v1.ts авторит все 12 practice-шагов
 * (после 3 интро), lesson1SessionChoreographyV1 сверяет их против
 * esSession14ModeNativeStepsV1() через LESSON1_ES_SESSION_14_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_14_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 14,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s14-v1',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_14_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_14_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_14_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_14_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_14_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_14_WORD_FIRST_INTRO,
  phrases: ES_EPISODE_01_SESSION_14_PHRASES,
});
