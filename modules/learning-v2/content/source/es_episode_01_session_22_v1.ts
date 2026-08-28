import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_22_GOAL,
  ES_EPISODE_01_SESSION_22_INTRO,
  ES_EPISODE_01_SESSION_22_SUMMARY,
  ES_EPISODE_01_SESSION_22_TITLE,
} from './es_episode_01_session_22_intro_v1';
import { ES_EPISODE_01_SESSION_22_PHRASES } from './es_episode_01_session_22_phrases_v1';
import { ES_EPISODE_01_SESSION_22_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_22_mode_native_v1';
import { LESSON1_ES_SESSION_22_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 22 «Важно или нет» —
 * собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 22,
 * kind: 'phrases', teaches: ['importance_adjective'], builtOn: [5, 21],
 * recalls: [5, 21].
 *
 * teaches: ['importance_adjective'] НЕ означает новое слово — importante уже
 * встречалось как обычное слово-признак в сессии 1 (Es importante,
 * es_episode_01_session_01_phrases_v1.ts) и в сессии 21 (El libro es
 * importante). Здесь тема получает первую СФОКУСИРОВАННУЮ трактовку: прямое
 * противопоставление importante его ближайшей смысловой противоположности в
 * курсе — igual («всё равно», уже введённой в сессии 19/21 именно как
 * реакция на отсутствие значимости: No es igual). Это тот же паттерн, что и
 * сессия 18 с caro (использован несистемно в сессии 1, формально
 * противопоставлен в 18) и сессии 19/20, которые recall уже известные
 * признаки без newVocabulary. kind: 'phrases' запрещает вводить новое слово,
 * поэтому igual используется как семантический контраст, а не однословный
 * антоним.
 *
 * Recurring noun — el libro (сессия 21, noun_gender): большинство из 15 фраз
 * применяют importante/igual к конкретной книге (El libro es importante,
 * El libro no es importante, El libro es igual), согласуя признак с родом
 * libro через артикль el и повторяя паттерн gender_agreement_full сессии 21
 * на соседних признаках (caro/rápido). Меньшинство фраз держит безличную
 * конструкцию Es importante / Es igual (сессия 1, 17) — про ситуации без
 * названного предмета. Recall pace_adjective (сессия 5, rápido/rápida)
 * вплетён в вопрос о приоритете (темп чтения против значимости книги).
 *
 * зачем sessionKindOverride: 'phrases' ОБЯЗАТЕЛЕН (та же причина, что в
 * сессиях 14, 17, 19, 20): lesson1SessionChoreographyV1 без явного override
 * молча берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же
 * номеру сессии — там сессия 22 имеет kind: 'words_then_phrases' (тема
 * «Моя семья», совсем другое содержание), а не 'phrases'. Проверено grep по
 * episode_01_session_map_v1.ts: sessionOrdinal 22 → kind: 'words_then_phrases'.
 * Без override мок-сборка может молча взять неверный тип сборки и неверное
 * число практических карточек.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * тот же приём, что в сессиях 7/8/10/11/17/19.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт
 * должен быть реальным действием внутри одной из шести утверждённых
 * механик. es_episode_01_session_22_mode_native_v1.ts авторит все 12
 * practice-шагов (после 3 интро), lesson1SessionChoreographyV1 сверяет их
 * против esSession22ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_22_MODE_NATIVE_PLAN_ID_V1. ВАЖНО: phrase_builder/
 * listen_build_dictation здесь используются только на индексах 0/1/5 —
 * остальные 12 фраз дают >8 уникальных дистракторов (см. подробный
 * комментарий в начале mode-native файла).
 */
export const ES_EPISODE_01_SESSION_22_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 22,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s22-v2',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_22_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_22_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_22_TITLE,
  summary: ES_EPISODE_01_SESSION_22_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_22_GOAL,
  introPages: ES_EPISODE_01_SESSION_22_INTRO,
  phrases: ES_EPISODE_01_SESSION_22_PHRASES,
});
