import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_19_GOAL,
  ES_EPISODE_01_SESSION_19_INTRO,
  ES_EPISODE_01_SESSION_19_SUMMARY,
  ES_EPISODE_01_SESSION_19_TITLE,
} from './es_episode_01_session_19_intro_v1';
import { ES_EPISODE_01_SESSION_19_PHRASES } from './es_episode_01_session_19_phrases_v1';
import { ES_EPISODE_01_SESSION_19_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_19_mode_native_v1';
import { LESSON1_ES_SESSION_19_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 19 «Это не так» —
 * собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 19,
 * kind: 'phrases', teaches: [], builtOn: [2, 17], recalls: [2, 11].
 *
 * Новых слов нет — 15 фраз соединяют отрицание no (сессия 2, «Это не так» —
 * тот же заголовок, но там про soy, первое лицо) со связкой es для третьего
 * лица предметов и ситуаций (сессия 17, «Это так»). В отличие от сессии 11
 * «Ты не» (которая перемешивала soy/eres/es), здесь ВСЕ 15 фраз держат
 * только es — это завершает парадигму отрицания связки ser по лицам:
 * no soy (сессия 2), no eres (сессия 11), теперь предметно no es. Признаки —
 * уже word-first-одобренная лексика (fácil/difícil/verdad/así/igual/
 * importante/caro/verdadero из сессии 1, bonito/bonita из сессии 3,
 * rápido/rápida из сессии 5, único/única из сессии 6). Согласование рода
 * повторяется на нескольких парах (recalls: [2, 11]).
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * тот же приём, что в сессиях 7/8/10/11/17.
 *
 * зачем sessionKindOverride: 'phrases' ОБЯЗАТЕЛЕН (владелец, 2026-08-25,
 * повторный урок после сессий 14 и 17): lesson1SessionChoreographyV1 без
 * явного override молча берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1
 * по тому же номеру сессии — это не бросает ошибку, а просто молча меняет
 * выбор/количество практических карточек. Установлено защитно с первого
 * черновика, независимо от того, совпадает ли сейчас английская сессия 19
 * с испанской по kind.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт
 * должен быть реальным действием внутри одной из шести утверждённых
 * механик. es_episode_01_session_19_mode_native_v1.ts авторит все 12
 * practice-шагов (после 3 интро), lesson1SessionChoreographyV1 сверяет их
 * против esSession19ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_19_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_19_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 19,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s19-v2',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_19_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_19_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_19_TITLE,
  summary: ES_EPISODE_01_SESSION_19_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_19_GOAL,
  introPages: ES_EPISODE_01_SESSION_19_INTRO,
  phrases: ES_EPISODE_01_SESSION_19_PHRASES,
});
