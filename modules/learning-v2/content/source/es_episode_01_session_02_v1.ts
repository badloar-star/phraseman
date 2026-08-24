import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_02_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_02_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_02_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_02_WORD_FIRST_TITLE,
} from './es_episode_01_session_02_intro_word_first_v1';
import { ES_EPISODE_01_SESSION_02_PHRASES } from './es_episode_01_session_02_phrases_v1';
import { ES_EPISODE_01_SESSION_02_VOCABULARY_V1 } from './es_episode_01_session_02_vocabulary_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 2 «Это не так» —
 * собранный источник.
 *
 * Тема из es_episode_01_session_map_v1.ts: sessionOrdinal 2, teaches
 * ['negation_no'], builtOn [1], recalls [1]. Единственное новое слово — no;
 * проходит word-first (recognize/retrieve_meaning/build_form), затем
 * применяется в двух фразах, использующих ТОЛЬКО слова сессии 1
 * (es, fácil, verdad) — No es fácil, No es verdad.
 */
export const ES_EPISODE_01_SESSION_02_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 2,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s02-v1',
  sessionKindOverride: 'words_then_phrases',
  title: ES_EPISODE_01_SESSION_02_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_02_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_02_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_02_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_02_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_02_PHRASES,
});
