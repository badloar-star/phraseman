import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_12_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_12_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_12_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_12_WORD_FIRST_TITLE,
} from './es_episode_01_session_12_intro_v1';
import { ES_EPISODE_01_SESSION_12_PHRASES } from './es_episode_01_session_12_phrases_v1';
import { ES_EPISODE_01_SESSION_12_VOCABULARY_V1 } from './es_episode_01_session_12_vocabulary_v1';
import { ES_EPISODE_01_SESSION_12_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_12_mode_native_v1';
import { LESSON1_ES_SESSION_12_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто» / Глава 2 «Ты: вопрос»,
 * сессия 12 «Спрашиваю женщину» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 12,
 * kind: 'words_then_phrases', teaches: ['confidence_adjective'],
 * builtOn: [3, 10], recalls: [3, 10].
 *
 * Единственное новое слово — segura (word-first: recognize → retrieve_meaning
 * → build_form), признак уверенности в себе. teaches заполнено после
 * research-подтверждения: карта до правки несла teaches: [] — единственная
 * аномалия среди всех words_then_phrases-сессий 1-56.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-27,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт должен
 * быть реальным действием внутри одной из шести утверждённых механик.
 * es_episode_01_session_12_mode_native_v1.ts авторит все 17 interactions,
 * lesson1SessionChoreographyV1 сверяет их против esSession12ModeNativeStepsV1()
 * через LESSON1_ES_SESSION_12_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_12_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 12,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s12-v1',
  sessionKindOverride: 'words_then_phrases',
  modeNativePlanId: LESSON1_ES_SESSION_12_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_12_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_12_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_12_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_12_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_12_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_12_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_12_PHRASES,
});
