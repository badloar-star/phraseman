import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_13_GOAL,
  ES_EPISODE_01_SESSION_13_INTRO,
  ES_EPISODE_01_SESSION_13_SUMMARY,
  ES_EPISODE_01_SESSION_13_TITLE,
} from './es_episode_01_session_13_intro_v1';
import { ES_EPISODE_01_SESSION_13_PHRASES } from './es_episode_01_session_13_phrases_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 13 «Местоимение не
 * нужно» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 13,
 * kind: 'phrases', teaches: ['pronoun_drop'], builtOn: [9, 10],
 * recalls: [1, 9].
 *
 * Новых слов нет — 15 фраз повторяют уже известную грамматику (eres/es/soy
 * + признаки из сессий 1, 3, 4, 5, 6, 9, 12). Тема pro-drop (испанский
 * обычно опускает подлежащее tú/yo, потому что окончание связки само
 * называет лицо) раскрывается только в трёх intro-страницах — решение по
 * прецеденту сессии 10, подтверждено research-агентом 2026-08-25:
 * EpisodeSourceWord.correct не может быть пустой строкой, значит
 * "отсутствие местоимения" нельзя смоделировать как кликабельную позицию.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2.
 */
export const ES_EPISODE_01_SESSION_13_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 13,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s13-v1',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_13_TITLE,
  summary: ES_EPISODE_01_SESSION_13_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_13_GOAL,
  introPages: ES_EPISODE_01_SESSION_13_INTRO,
  phrases: ES_EPISODE_01_SESSION_13_PHRASES,
});
