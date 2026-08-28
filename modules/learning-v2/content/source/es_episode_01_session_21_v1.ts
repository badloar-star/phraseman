import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_21_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_21_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_21_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_21_WORD_FIRST_TITLE,
} from './es_episode_01_session_21_intro_v1';
import { ES_EPISODE_01_SESSION_21_PHRASES } from './es_episode_01_session_21_phrases_v1';
import { ES_EPISODE_01_SESSION_21_VOCABULARY_V1 } from './es_episode_01_session_21_vocabulary_v1';
import { ES_EPISODE_01_SESSION_21_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_21_mode_native_v1';
import { LESSON1_ES_SESSION_21_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 21 «Предмет — он или
 * она» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 21,
 * kind: 'words_then_phrases', teaches: ['noun_gender'], builtOn: [17, 18],
 * recalls: [3, 18].
 *
 * Единственное новое слово — libro (word-first: recognize → retrieve_meaning
 * → build_form), СУЩЕСТВИТЕЛЬНОЕ мужского рода «книга» — впервые в курсе
 * word-first единица вводит не прилагательное, а предмет со своим
 * ЗАФИКСИРОВАННЫМ грамматическим родом. Проверено grep по всем
 * es_episode_01_session_*.ts — libro/casa/mesa/coche/perro/gato ни разу не
 * встречались раньше в курсе. Выбран мужской род на -o (не casa/mesa на -a)
 * как самый регулярный, учебниковый паттерн для ПЕРВОЙ сессии о роде
 * существительных.
 *
 * El/la вводятся как обычные позиционные словесные токены внутри phrases
 * (как no/de в прежних сессиях), а не отдельная word-first единица —
 * артикли являются служебными словами, а не лексикой для заучивания.
 *
 * Recalls gender_agreement_full (3) — та же формула -o/-a, что и у
 * caro/cara, bonito/bonita; recalls price_adjective (18) — caro/barato,
 * которые здесь согласуются уже не с абстрактным "по умолчанию", а с
 * конкретным родом слова libro. builtOn 17 (третье лицо, es для предметов)
 * и 18 (сама пара caro/barato) — обе темы напрямую используются в каждой
 * фразе этой сессии.
 *
 * зачем sessionKindOverride: 'words_then_phrases' ОБЯЗАТЕЛЕН (та же причина,
 * что в сессиях 12, 14, 17, 18): lesson1SessionChoreographyV1 без явного
 * override молча берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по
 * тому же номеру сессии — там сессия 21 имеет другой kind. Без override
 * мок-сборка может молча получить неверное число практических карточек.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт
 * должен быть реальным действием внутри одной из шести утверждённых
 * механик. es_episode_01_session_21_mode_native_v1.ts авторит все 17
 * practice-шагов (после 3 интро), lesson1SessionChoreographyV1 сверяет их
 * против esSession21ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_21_MODE_NATIVE_PLAN_ID_V1. ВАЖНО: phrase_builder/
 * listen_build_dictation здесь НЕ используются на фразах — все 15 фраз
 * дают >8 уникальных дистракторов (4-6 слов × 2 дистрактора каждое),
 * превышая предел responseFeedbackById в course_session_client_children_v1.ts
 * (см. подробный комментарий в начале mode-native файла).
 */
export const ES_EPISODE_01_SESSION_21_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 21,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s21-v2',
  sessionKindOverride: 'words_then_phrases',
  modeNativePlanId: LESSON1_ES_SESSION_21_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_21_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_21_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_21_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_21_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_21_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_21_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_21_PHRASES,
});
