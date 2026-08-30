import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_01_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_01_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_01_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_01_WORD_FIRST_TITLE,
} from './es_episode_01_session_01_intro_word_first_v1';
import { ES_EPISODE_01_SESSION_01_PHRASES } from './es_episode_01_session_01_phrases_v1';
import { ES_EPISODE_01_SESSION_01_VOCABULARY_V1 } from './es_episode_01_session_01_vocabulary_v1';
import { ES_EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_01_mode_native_v1';
import { LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 1 «Это легко» —
 * собранный источник.
 *
 * Тема утверждена владельцем 2026-08-23 (docs/v2/SPANISH_CURRICULUM_GRID.ru.md).
 * Заменяет прежнюю версию про estar, которая по итогам ресерча (VanPatten
 * 1985/2010) стала уроками 8 (место) и 13 (состояние).
 *
 * Отдельный packageId и targetLanguage: 'es' — это то, что делает контур
 * независимым. Английский курс использует 'learning-v2-en-v1'/'en' и о
 * существовании этого файла не знает.
 *
 * зачем word-first, а не phrases (владелец, 2026-08-24, "разблокировать все
 * сессии и переписать их с самого начала... каждое новое слово должно быть
 * всегда перед этим быть точки соприкосновения со словом"): копирует паттерн,
 * который параллельная английская сессия реализовала первой для сессии 1
 * (I/am/here/ready). Здесь слова — es, soy, fácil, verdad: каждое проходит
 * recognize → retrieve_meaning → build_form (одиночное слово на экране, без
 * пробела) до того, как встретится во фразе. Фразы применения — Es fácil и
 * Es verdad, обе уже входят в утверждённый список ключевых фраз урока 1.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-25/26,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md + СТАРТ ES §0): каждый обязательный
 * контакт должен быть реальным действием внутри одной из шести утверждённых
 * механик, а не generic-карточкой с меткой family. es_episode_01_session_01_mode_native_v1.ts
 * авторит все 17 interactions с испанским family-native payload (свои audio
 * id, свои испанские фонетические/семантические ловушки — НЕ перенос
 * английских), lesson1SessionChoreographyV1 сверяет их против
 * session01ModeNativeStepsV1() через LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1
 * (session_shard_from_source_v1.ts бросает session_source_mode_native_step_mismatch
 * при любом расхождении family/purpose/learningStage/target).
 */
export const ES_EPISODE_01_SESSION_01_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 1,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-rewrite-es-e01-s01-v1',
  // зачем: без этого choreography молча берёт kind из английской карты по
  // тому же номеру сессии (session_shard_from_source_v1.ts, sessionKindOverride).
  sessionKindOverride: 'words_then_phrases',
  modeNativePlanId: LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_01_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_01_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_01_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_01_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_01_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_01_VOCABULARY_V1,
  // зачем именно эти две фразы (не срез с начала массива, как у английского
  // эталона): единственные две фразы урока 1, состоящие ТОЛЬКО из четырёх
  // изученных здесь слов (es, soy, fácil, verdad) плюс отрицания/связок, уже
  // знакомых до этой сессии. Остальные 13 фраз вводят слова вне словаря этой
  // сессии (rápido, difícil, así, igual...) — им нельзя быть в apply_in_phrase
  // здесь, это и есть нарушение, которое чинит весь этот файл.
  phrases: Object.freeze(
    ES_EPISODE_01_SESSION_01_PHRASES.filter(
      (phrase) => phrase.id === 'es-e01-s01-es-facil' || phrase.id === 'es-e01-s01-es-verdad',
    ),
  ),
});
