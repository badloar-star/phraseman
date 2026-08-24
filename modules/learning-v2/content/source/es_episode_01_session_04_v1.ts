import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_04_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_04_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_04_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_04_WORD_FIRST_TITLE,
} from './es_episode_01_session_04_intro_word_first_v1';
import { ES_EPISODE_01_SESSION_04_PHRASES } from './es_episode_01_session_04_phrases_v1';
import { ES_EPISODE_01_SESSION_04_VOCABULARY_V1 } from './es_episode_01_session_04_vocabulary_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 4 «Правда или нет» —
 * собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 4,
 * kind: 'words_then_phrases', teaches: ['truth_adjective'],
 * builtOn: [1, 3], recalls: [1, 3].
 *
 * Единственное новое слово — verdadero (word-first: recognize →
 * retrieve_meaning → build_form), его женская форма verdadera вводится тем же
 * build_form-контактом как результат правила -o→-a (как bonito/bonita в
 * сессии 3). Фразы применения — Es verdadero / Es verdadera, обе используют
 * только уже известные слова (es из сессии 1, verdadero/verdadera — здесь).
 */
export const ES_EPISODE_01_SESSION_04_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 4,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s04-v1',
  sessionKindOverride: 'words_then_phrases',
  title: ES_EPISODE_01_SESSION_04_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_04_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_04_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_04_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_04_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_04_PHRASES,
});
