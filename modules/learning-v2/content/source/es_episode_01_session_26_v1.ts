import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_26_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_26_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_26_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_26_WORD_FIRST_TITLE,
} from './es_episode_01_session_26_intro_v1';
import { ES_EPISODE_01_SESSION_26_PHRASES } from './es_episode_01_session_26_phrases_v1';
import { ES_EPISODE_01_SESSION_26_VOCABULARY_V1 } from './es_episode_01_session_26_vocabulary_v1';
import { ES_EPISODE_01_SESSION_26_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_26_mode_native_v1';
import { LESSON1_ES_SESSION_26_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 26 «Много: и признак
 * меняется» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 26,
 * kind: 'words_then_phrases', teaches: ['plural_agreement'], builtOn: [3, 25],
 * recalls: [3, 25].
 *
 * Единственное новое слово — rápidos (word-first: recognize → retrieve_meaning
 * → build_form), форма МНОЖЕСТВЕННОГО числа мужского рода уже известного
 * прилагательного rápido (сессия 5). Впервые признак согласуется сразу по
 * ДВУМ осям: роду (-o/-a, сессия 3) и числу (-s/-es, тема этой сессии).
 * El/la не участвуют здесь — предметный род был темой сессии 21, эта сессия
 * про сам признак и его согласование при первом лице множественного числа.
 *
 * зачем sessionKindOverride: 'words_then_phrases' ОБЯЗАТЕЛЕН (та же причина,
 * что в сессиях 12, 14, 17, 18, 21): lesson1SessionChoreographyV1 без явного
 * override молча берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по
 * тому же номеру сессии. Без override мок-сборка может молча получить
 * неверное число практических карточек.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт
 * должен быть реальным действием внутри одной из шести утверждённых
 * механик. es_episode_01_session_26_mode_native_v1.ts авторит все 17
 * practice-шагов, lesson1SessionChoreographyV1 сверяет их против
 * esSession26ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_26_MODE_NATIVE_PLAN_ID_V1. Интро (concept/formula/
 * trap) и два контакта словаря (recognize/build_form guidance) переписаны
 * в том же проходе — легаси-тела трёх страниц интро были 480-602 знака и
 * 4-5 предложений (выше потолка 320/4), а два guidance-текста словаря были
 * 236 и 242 знака (выше потолка intro_guidance_overloaded 200); смысл
 * сохранён, форма ужата.
 */
export const ES_EPISODE_01_SESSION_26_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 26,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s26-v2',
  sessionKindOverride: 'words_then_phrases',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_26_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_26_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_26_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_26_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_26_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_26_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_26_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_26_PHRASES,
});
