import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_03_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_03_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_03_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_03_WORD_FIRST_TITLE,
} from './es_episode_01_session_03_intro_word_first_v1';
import { ES_EPISODE_01_SESSION_03_PHRASES } from './es_episode_01_session_03_phrases_v1';
import { ES_EPISODE_01_SESSION_03_VOCABULARY_V1 } from './es_episode_01_session_03_vocabulary_v1';
import { ES_EPISODE_01_SESSION_03_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_03_mode_native_v1';
import { LESSON1_ES_SESSION_03_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 3 «Мужской и женский
 * род» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 3,
 * kind: 'words_then_phrases', teaches: ['gender_agreement_full'],
 * builtOn: [1], recalls: [1, 2].
 *
 * Единственное новое слово — bonito (word-first: recognize → retrieve_meaning
 * → build_form), его женская форма bonita вводится тем же build_form-контактом
 * как результат правила -o→-a, а не как отдельный лексический элемент.
 * Фразы применения — Es bonito / Es bonita, обе используют только уже
 * известные слова (es из сессии 1, bonito/bonita — здесь).
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-27,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md + СТАРТ ES §0, тот же паттерн, что
 * ES_EPISODE_01_SESSION_01_SOURCE/ES_EPISODE_01_SESSION_02_SOURCE): каждый
 * обязательный контакт должен быть реальным действием внутри одной из шести
 * утверждённых механик, а не generic-карточкой с меткой family.
 * es_episode_01_session_03_mode_native_v1.ts авторит все 17 interactions с
 * испанским family-native payload, lesson1SessionChoreographyV1 сверяет их
 * против esSession03ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_03_MODE_NATIVE_PLAN_ID_V1
 * (session_shard_from_source_v1.ts бросает session_source_mode_native_step_mismatch
 * при любом расхождении family/purpose/learningStage/target).
 */
export const ES_EPISODE_01_SESSION_03_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 3,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s03-v1',
  sessionKindOverride: 'words_then_phrases',
  modeNativePlanId: LESSON1_ES_SESSION_03_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_03_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_03_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_03_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_03_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_03_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_03_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_03_PHRASES,
});
