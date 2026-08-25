import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_21_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_21_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_21_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_21_WORD_FIRST_TITLE,
} from './es_episode_01_session_21_intro_v1';
import { ES_EPISODE_01_SESSION_21_PHRASES } from './es_episode_01_session_21_phrases_v1';
import { ES_EPISODE_01_SESSION_21_VOCABULARY_V1 } from './es_episode_01_session_21_vocabulary_v1';

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
 */
export const ES_EPISODE_01_SESSION_21_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 21,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s21-v1',
  sessionKindOverride: 'words_then_phrases',
  title: ES_EPISODE_01_SESSION_21_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_21_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_21_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_21_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_21_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_21_PHRASES,
});
