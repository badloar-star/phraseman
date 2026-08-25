import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_17_GOAL,
  ES_EPISODE_01_SESSION_17_INTRO,
  ES_EPISODE_01_SESSION_17_SUMMARY,
  ES_EPISODE_01_SESSION_17_TITLE,
} from './es_episode_01_session_17_intro_v1';
import { ES_EPISODE_01_SESSION_17_PHRASES } from './es_episode_01_session_17_phrases_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 17 «Это так» —
 * собранный источник. Открывает Главу 3 «Он, она, оно: предметы и
 * ситуации».
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 17,
 * kind: 'phrases', teaches: ['third_person_singular'], builtOn: [1, 9],
 * recalls: [3].
 *
 * Новых слов нет — 15 фраз называют то, что сессия 1 уже использовала
 * неявно (es fácil, es verdad, ...): es — третье лицо единственного числа
 * связки ser, форма для предмета или ситуации, в явном контрасте с eres
 * (сессия 9, «ты») и soy (сессия 1, «я»). Признаки — уже word-first-
 * одобренная лексика (fácil/difícil/verdad/así/igual/importante/caro/
 * verdadero из сессии 1, bonito/bonita из сессии 3, rápido/rápida из
 * сессии 5, único/única из сессии 6). Согласование рода повторяется
 * (recalls: [3]). Тема раскрывается ТОЛЬКО в трёх intro-страницах —
 * решение по прецеденту сессий 9 и 13.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2.
 *
 * зачем sessionKindOverride: 'phrases' ОБЯЗАТЕЛЕН (владелец, 2026-08-25):
 * lesson1SessionChoreographyV1 без явного override молча берёт kind из
 * АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же номеру сессии
 * (см. комментарий в lesson1_session_choreography_v1.ts). Английская
 * сессия 17 — 'words_then_phrases' («Он и она»), тогда как испанская карта
 * ES_EPISODE_01_SESSION_MAP_V1 держит 17 как 'phrases'. Без override мок-
 * сборка молча получала 17 практических карточек вместо ожидаемых 12
 * (SESSION_PRACTICE_CARD_COUNT_V1 = 15 - 3) — найдено при верификации.
 */
export const ES_EPISODE_01_SESSION_17_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 17,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s17-v1',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_17_TITLE,
  summary: ES_EPISODE_01_SESSION_17_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_17_GOAL,
  introPages: ES_EPISODE_01_SESSION_17_INTRO,
  phrases: ES_EPISODE_01_SESSION_17_PHRASES,
});
