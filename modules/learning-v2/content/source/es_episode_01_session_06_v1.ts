import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_06_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_06_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_06_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_06_WORD_FIRST_TITLE,
} from './es_episode_01_session_06_intro_word_first_v1';
import { ES_EPISODE_01_SESSION_06_PHRASES } from './es_episode_01_session_06_phrases_v1';
import { ES_EPISODE_01_SESSION_06_VOCABULARY_V1 } from './es_episode_01_session_06_vocabulary_v1';
import { ES_EPISODE_01_SESSION_06_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_06_mode_native_v1';
import { LESSON1_ES_SESSION_06_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 6 «Ударение слышно» —
 * собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 6,
 * kind: 'words_then_phrases', teaches: ['written_accent'],
 * builtOn: [1, 5], recalls: [1, 5].
 *
 * Единственное новое слово — único (word-first: recognize →
 * retrieve_meaning → build_form), форма única — результат build_form
 * (-o → -a); тильда над ú остаётся неизменной в обеих формах, отмечая
 * ударение, а не род. Recalls fácil (1) и rápido (5) — оба тоже с
 * ударением на á первого слога. Фразы: Es único / Es única.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-27,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md + СТАРТ ES §0, тот же паттерн, что
 * ES_EPISODE_01_SESSION_04_SOURCE/ES_EPISODE_01_SESSION_05_SOURCE): каждый
 * обязательный контакт должен быть реальным действием внутри одной из шести
 * утверждённых механик, а не generic-карточкой с меткой family.
 * es_episode_01_session_06_mode_native_v1.ts авторит все 17 interactions с
 * испанским family-native payload, lesson1SessionChoreographyV1 сверяет их
 * против esSession06ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_06_MODE_NATIVE_PLAN_ID_V1
 * (session_shard_from_source_v1.ts бросает session_source_mode_native_step_mismatch
 * при любом расхождении family/purpose/learningStage/target).
 */
export const ES_EPISODE_01_SESSION_06_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 6,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s06-v1',
  sessionKindOverride: 'words_then_phrases',
  modeNativePlanId: LESSON1_ES_SESSION_06_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_06_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_06_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_06_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_06_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_06_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_06_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_06_PHRASES,
});
