import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_24_CHECKPOINT_GOAL,
  ES_EPISODE_01_SESSION_24_CHECKPOINT_INTRO,
  ES_EPISODE_01_SESSION_24_CHECKPOINT_SUMMARY,
  ES_EPISODE_01_SESSION_24_CHECKPOINT_TITLE,
} from './es_episode_01_session_24_intro_v1';
import { ES_EPISODE_01_SESSION_24_CHECKPOINT_PHRASES } from './es_episode_01_session_24_phrases_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 24 «Он, она, оно
 * целиком» — собранный источник. Закрывает Главу 3 «Он, она, оно:
 * предметы и ситуации».
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 24,
 * kind: 'checkpoint', teaches: [], builtOn: [17,18,19,20,21,22,23],
 * recalls: [17,19,20,21,22].
 *
 * Checkpoint, как и voice, НЕ вводит новых слов — переиспользует ровно тот
 * же набор из 15 уже утверждённых фраз, что и voice-сессия 23 (см.
 * es_episode_01_session_24_phrases_v1.ts). Choreography (checkpointSteps в
 * lesson1_session_choreography_v1.ts) применяет другой набор family
 * (speed_match, listen_build_dictation, context_gap_grammar, phrase_builder)
 * и support:'none'/promptNovelty:'novel' — задание требует применить
 * материал без подсказки, вразнобой, а не повторить его вслух с моделью.
 */
export const ES_EPISODE_01_SESSION_24_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 24,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-checkpoint-es-e01-s24-v1',
  sessionKindOverride: 'checkpoint',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_24_CHECKPOINT_TITLE,
  summary: ES_EPISODE_01_SESSION_24_CHECKPOINT_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_24_CHECKPOINT_GOAL,
  introPages: ES_EPISODE_01_SESSION_24_CHECKPOINT_INTRO,
  phrases: ES_EPISODE_01_SESSION_24_CHECKPOINT_PHRASES,
});
