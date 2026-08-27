import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_09_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_09_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_09_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_09_WORD_FIRST_TITLE,
} from './es_episode_01_session_09_intro_word_first_v1';
import { ES_EPISODE_01_SESSION_09_PHRASES } from './es_episode_01_session_09_phrases_v1';
import { ES_EPISODE_01_SESSION_09_VOCABULARY_V1 } from './es_episode_01_session_09_vocabulary_v1';
import { ES_EPISODE_01_SESSION_09_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_09_mode_native_v1';
import { LESSON1_ES_SESSION_09_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто» / Глава 2 «Ты: вопрос»,
 * сессия 9 «Ты есть» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 9,
 * kind: 'phrases' (override: 'words_then_phrases' — вводит слово),
 * teaches: ['second_person_singular'], builtOn: [1], recalls: [3].
 *
 * Единственное новое слово — eres (word-first: recognize → retrieve_meaning
 * → build_form), связка второго лица единственного числа — та же роль, что
 * soy/es из сессии 1, но для собеседника. Фразы применения переносят уже
 * известное согласование признака (bonito/bonita из сессии 3, rápido/rápida
 * из сессии 5) на новую связку.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-27,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт должен
 * быть реальным действием внутри одной из шести утверждённых механик.
 * es_episode_01_session_09_mode_native_v1.ts авторит все 17 interactions,
 * lesson1SessionChoreographyV1 сверяет их против esSession09ModeNativeStepsV1()
 * через LESSON1_ES_SESSION_09_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_09_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 9,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s09-v1',
  sessionKindOverride: 'words_then_phrases',
  modeNativePlanId: LESSON1_ES_SESSION_09_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_09_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_09_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_09_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_09_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_09_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_09_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_09_PHRASES,
});
