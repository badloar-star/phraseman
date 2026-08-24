import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_05_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_05_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_05_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_05_WORD_FIRST_TITLE,
} from './es_episode_01_session_05_intro_word_first_v1';
import { ES_EPISODE_01_SESSION_05_PHRASES } from './es_episode_01_session_05_phrases_v1';
import { ES_EPISODE_01_SESSION_05_VOCABULARY_V1 } from './es_episode_01_session_05_vocabulary_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 5 «Быстрый и
 * медленный» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 5,
 * kind: 'phrases', teaches: ['pace_adjective'], builtOn: [1], recalls: [2, 4].
 *
 * Единственное новое слово — rápido (word-first: recognize →
 * retrieve_meaning → build_form), его женская форма rápida — результат
 * build_form-контакта (-o → -a). «Медленный» не заводит отдельное слово —
 * выражается отрицанием (No es rápido), тот же приём, что No es fácil в
 * сессии 2. Фразы: Es rápido / Es rápida / No es rápido.
 */
export const ES_EPISODE_01_SESSION_05_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 5,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s05-v1',
  sessionKindOverride: 'words_then_phrases',
  title: ES_EPISODE_01_SESSION_05_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_05_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_05_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_05_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_05_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_05_PHRASES,
});
