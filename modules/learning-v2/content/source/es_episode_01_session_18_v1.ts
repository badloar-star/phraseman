import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_18_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_18_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_18_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_18_WORD_FIRST_TITLE,
} from './es_episode_01_session_18_intro_v1';
import { ES_EPISODE_01_SESSION_18_PHRASES } from './es_episode_01_session_18_phrases_v1';
import { ES_EPISODE_01_SESSION_18_VOCABULARY_V1 } from './es_episode_01_session_18_vocabulary_v1';
import { ES_EPISODE_01_SESSION_18_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_18_mode_native_v1';
import { LESSON1_ES_SESSION_18_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 18 «Дорого или
 * дёшево» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 18,
 * kind: 'words_then_phrases', teaches: ['price_adjective'], builtOn: [17],
 * recalls: [3, 17].
 *
 * Единственное новое слово — barato (word-first: recognize → retrieve_meaning
 * → build_form), признак низкой цены. Caro/cara НЕ вводится здесь word-first —
 * оно уже звучало как обычное слово фразы в сессии 1 (es-e01-s01-es-caro) и
 * в сессии 17 (es-e01-s17-es-caro); эта сессия его ПРИПОМИНАЕТ (recalls: [17]),
 * противопоставляя новому barato. Recalls gender_agreement_full (3) — та же
 * формула -o/-a, что и caro/cara, bonito/bonita, rápido/rápida.
 *
 * зачем sessionKindOverride: 'words_then_phrases' ОБЯЗАТЕЛЕН (владелец,
 * 2026-08-25): lesson1SessionChoreographyV1 без явного override молча берёт
 * kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же номеру
 * сессии (см. комментарий в lesson1_session_choreography_v1.ts). Без
 * override мок-сборка может молча получить неверное число практических
 * карточек — тот же класс бага, что уже дважды находили в сессиях 14 и 17
 * этого конвейера.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт
 * должен быть реальным действием внутри одной из шести утверждённых
 * механик. es_episode_01_session_18_mode_native_v1.ts авторит все 17
 * practice-шагов (после 3 интро), lesson1SessionChoreographyV1 сверяет их
 * против esSession18ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_18_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_18_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 18,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s18-v2',
  sessionKindOverride: 'words_then_phrases',
  modeNativePlanId: LESSON1_ES_SESSION_18_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_18_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_18_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_18_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_18_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_18_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_18_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_18_PHRASES,
});
