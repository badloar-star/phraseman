import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_11_GOAL,
  ES_EPISODE_01_SESSION_11_INTRO,
  ES_EPISODE_01_SESSION_11_SUMMARY,
  ES_EPISODE_01_SESSION_11_TITLE,
} from './es_episode_01_session_11_intro_v1';
import { ES_EPISODE_01_SESSION_11_PHRASES } from './es_episode_01_session_11_phrases_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 11 «Ты не» —
 * собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 11,
 * kind: 'phrases', teaches: [], builtOn: [2, 9], recalls: [2, 9].
 *
 * Новых слов нет — 15 фраз комбинируют отрицание no (сессия 2) со всеми
 * тремя связками ser (soy/eres/es из сессий 1 и 9) и уже известными
 * признаками (bonito/bonita, rápido/rápida, único/única, fácil, verdad,
 * verdadero). Пунктуация не нужна — эта сессия учит порядку слов при
 * отрицании, не пунктуации.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * тот же приём, что в сессиях 7/8/10.
 */
export const ES_EPISODE_01_SESSION_11_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 11,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s11-v1',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_11_TITLE,
  summary: ES_EPISODE_01_SESSION_11_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_11_GOAL,
  introPages: ES_EPISODE_01_SESSION_11_INTRO,
  phrases: ES_EPISODE_01_SESSION_11_PHRASES,
});
