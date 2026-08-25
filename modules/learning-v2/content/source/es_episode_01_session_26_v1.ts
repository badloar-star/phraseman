import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_26_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_26_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_26_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_26_WORD_FIRST_TITLE,
} from './es_episode_01_session_26_intro_v1';
import { ES_EPISODE_01_SESSION_26_PHRASES } from './es_episode_01_session_26_phrases_v1';
import { ES_EPISODE_01_SESSION_26_VOCABULARY_V1 } from './es_episode_01_session_26_vocabulary_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 26 «Много: и признак
 * меняется» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 26,
 * kind: 'words_then_phrases', teaches: ['plural_agreement'], builtOn: [3, 25],
 * recalls: [3, 25].
 *
 * Единственное новое слово — rápidos (word-first: recognize → retrieve_meaning
 * → build_form), форма МНОЖЕСТВЕННОГО числа мужского рода уже известного
 * прилагательного rápido (сессия 5). Впервые признак согласуется сразу по
 * ДВУМ осям: роду (-o/-a, сессия 3) и числу (-s/-es, тема этой сессии).
 * El/la не участвуют здесь — предметный род был темой сессии 21, эта сессия
 * про сам признак и его согласование при первом лице множественного числа.
 *
 * зачем sessionKindOverride: 'words_then_phrases' ОБЯЗАТЕЛЕН (та же причина,
 * что в сессиях 12, 14, 17, 18, 21): lesson1SessionChoreographyV1 без явного
 * override молча берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по
 * тому же номеру сессии. Без override мок-сборка может молча получить
 * неверное число практических карточек.
 */
export const ES_EPISODE_01_SESSION_26_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 26,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s26-v1',
  sessionKindOverride: 'words_then_phrases',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_26_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_26_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_26_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_26_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_26_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_26_PHRASES,
});
