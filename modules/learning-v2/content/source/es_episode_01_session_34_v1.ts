import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_34_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_34_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_34_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_34_WORD_FIRST_TITLE,
} from './es_episode_01_session_34_intro_v1';
import { ES_EPISODE_01_SESSION_34_PHRASES } from './es_episode_01_session_34_phrases_v1';
import { ES_EPISODE_01_SESSION_34_VOCABULARY_V1 } from './es_episode_01_session_34_vocabulary_v1';
import { ES_EPISODE_01_SESSION_34_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_34_mode_native_v1';
import { LESSON1_ES_SESSION_34_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 34 «Одинаковое и
 * разное» — собранный источник, написан с нуля (владелец отклонил легаси-
 * черновики Главы 5 в целом; для сессий 34-40 легаси-файлов на диске не
 * было вовсе — проверено grep, единственный совпавший набор
 * episode_01_session_34..40_*.ts принадлежит АНГЛИЙСКОМУ треку, не
 * испанскому).
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 34,
 * kind: 'words_then_phrases', teaches: ['comparison_basic_adjective'],
 * builtOn: [33], recalls: [4, 33].
 *
 * Единственное новое слово — diferente (word-first: recognize →
 * retrieve_meaning → build_form), «другой, отличающийся»,
 * НЕИЗМЕНЯЕМОЕ прилагательное (класс fácil/igual: одна форма -e для обоих
 * родов, множественное просто добавляет -s). Проверено grep по всему
 * испанскому корпусу — diferente ни разу не встречалось как испанский
 * target (все совпадения строки "diferente" — слово ПОРТУГАЛЬСКОГО
 * объяснения "different" внутри pt-BR-текста).
 *
 * зачем НЕ переопределено igual: igual уже введено в сессии 14 со
 * ЗАКРЕПЛЁННЫМ значением «всё равно, без разницы» (не «то же самое»).
 * Тема "Одинаковое и разное" раскрывается через diferente (новое) в паре
 * с igual (recall в его прежнем значении) — оба слова остаются в своих
 * значениях, ничего не переопределяется задним числом.
 *
 * Recalls quality_extended_adjective (сессия 33, bueno/malo) — используется
 * в двух фразах как контраст ДРУГОГО класса согласования (-o/-a), чтобы
 * явно показать разницу между инвариантным diferente/igual и изменяемым
 * bueno/malo. Recall truth_adjective (сессия 4) обеспечивается тем же
 * грамматическим каркасом ser + отрицание, что и раньше.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * та же экономия, что и в сессиях 10/14/17/25/26/27/28/29/30/33.
 *
 * зачем sessionKindOverride: 'words_then_phrases' ОБЯЗАТЕЛЕН (та же причина,
 * что в сессиях 14/17/22/25/33): lesson1SessionChoreographyV1 без явного
 * override молча берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по
 * тому же номеру сессии — там сессия 34 совсем другое содержание.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): написано с нуля по образцу кода
 * (не данных — их не было) сессии 33. es_episode_01_session_34_mode_native_v1.ts
 * авторит все 17 practice-шагов, lesson1SessionChoreographyV1 сверяет их
 * против esSession34ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_34_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_34_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 34,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s34-v1',
  sessionKindOverride: 'words_then_phrases',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_34_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_34_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_34_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_34_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_34_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_34_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_34_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_34_PHRASES,
});
