import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_17_GOAL,
  ES_EPISODE_01_SESSION_17_INTRO,
  ES_EPISODE_01_SESSION_17_SUMMARY,
  ES_EPISODE_01_SESSION_17_TITLE,
} from './es_episode_01_session_17_intro_v1';
import { ES_EPISODE_01_SESSION_17_PHRASES } from './es_episode_01_session_17_phrases_v1';
import { ES_EPISODE_01_SESSION_17_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_17_mode_native_v1';
import { LESSON1_ES_SESSION_17_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто» / Глава 3 «Он, она, оно:
 * предметы и ситуации», сессия 17 «Это так» — собранный источник.
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
 * АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же номеру сессии.
 * Английская сессия 17 — 'words_then_phrases' («Он и она»), тогда как
 * испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 17 как 'phrases'.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт
 * должен быть реальным действием внутри одной из шести утверждённых
 * механик. es_episode_01_session_17_mode_native_v1.ts авторит все 12
 * practice-шагов (после 3 интро), lesson1SessionChoreographyV1 сверяет их
 * против esSession17ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_17_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_17_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 17,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s17-v2',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_17_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_17_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_17_TITLE,
  summary: ES_EPISODE_01_SESSION_17_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_17_GOAL,
  introPages: ES_EPISODE_01_SESSION_17_INTRO,
  phrases: ES_EPISODE_01_SESSION_17_PHRASES,
});
