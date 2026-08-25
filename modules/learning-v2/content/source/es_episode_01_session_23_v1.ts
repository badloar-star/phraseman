import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_23_VOICE_GOAL,
  ES_EPISODE_01_SESSION_23_VOICE_INTRO,
  ES_EPISODE_01_SESSION_23_VOICE_SUMMARY,
  ES_EPISODE_01_SESSION_23_VOICE_TITLE,
} from './es_episode_01_session_23_intro_v1';
import { ES_EPISODE_01_SESSION_23_VOICE_PHRASES } from './es_episode_01_session_23_phrases_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 23 «Скажи вслух:
 * оцени ситуацию» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 23,
 * kind: 'voice', teaches: [],
 * builtOn: [17, 18, 20], recalls: [17, 18, 20].
 *
 * Voice-сессия НЕ вводит новых слов (kindMayIntroduceVocabulary возвращает
 * false для 'voice') — переиспользует 15 уже утверждённых оценочных фраз из
 * сессий 17, 18, 20 (см. es_episode_01_session_23_phrases_v1.ts).
 * distractorAuthorship: 'manual' — дистракторы уже вручную выверены в
 * исходных сессиях, апгрейд не нужен.
 */
export const ES_EPISODE_01_SESSION_23_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 23,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-voice-es-e01-s23-v1',
  sessionKindOverride: 'voice',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_23_VOICE_TITLE,
  summary: ES_EPISODE_01_SESSION_23_VOICE_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_23_VOICE_GOAL,
  introPages: ES_EPISODE_01_SESSION_23_VOICE_INTRO,
  phrases: ES_EPISODE_01_SESSION_23_VOICE_PHRASES,
});
