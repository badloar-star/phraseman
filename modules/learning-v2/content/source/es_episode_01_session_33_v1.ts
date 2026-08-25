import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_33_WORD_FIRST_GOAL,
  ES_EPISODE_01_SESSION_33_WORD_FIRST_INTRO,
  ES_EPISODE_01_SESSION_33_WORD_FIRST_SUMMARY,
  ES_EPISODE_01_SESSION_33_WORD_FIRST_TITLE,
} from './es_episode_01_session_33_intro_v1';
import { ES_EPISODE_01_SESSION_33_PHRASES } from './es_episode_01_session_33_phrases_v1';
import { ES_EPISODE_01_SESSION_33_VOCABULARY_V1 } from './es_episode_01_session_33_vocabulary_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 33 «Хорошо или плохо»
 * — собранный источник. Открывает Главу 5 «Больше признаков».
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 33,
 * kind: 'words_then_phrases', teaches: ['quality_extended_adjective'],
 * builtOn: [1, 4], recalls: [1, 4].
 *
 * Единственное новое слово — bueno (word-first: recognize → retrieve_meaning
 * → build_form), общая оценка «хороший», мужской род на -o, парная к buena
 * по уже знакомой формуле -o/-a (сессия 3). Проверено grep по всему
 * испанскому корпусу — bueno/buena/malo/mala ни разу не встречались раньше.
 * Malo (антипод «плохой») используется как дистрактор в нескольких фразах,
 * но НЕ вводится как собственная word-first единица этой сессии.
 *
 * Recalls quality_adjective/gender_agreement_basic (сессия 1) и
 * truth_adjective (сессия 4) — та же механика согласования признака по роду
 * и числу, применённая к новому словарю. Ничего нового по грамматике: все
 * 15 фраз сэмплируют уже отработанные пять лиц связки ser (soy/eres/es/
 * somos/son) и отрицание, единственная новизна — сам словарь.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * та же экономия, что и в сессиях 10/14/17/25/26/27/28/29/30.
 *
 * зачем sessionKindOverride: 'words_then_phrases' ОБЯЗАТЕЛЕН (найдено при
 * аудите сессий 14/17/25): lesson1SessionChoreographyV1 без явного override
 * молча берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же
 * номеру сессии. Испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 33 как
 * 'words_then_phrases' — override зафиксирован здесь явно с первого
 * черновика, независимо от того, что стоит в английской карте по тому же
 * номеру.
 */
export const ES_EPISODE_01_SESSION_33_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 33,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s33-v1',
  sessionKindOverride: 'words_then_phrases',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_33_WORD_FIRST_TITLE,
  summary: ES_EPISODE_01_SESSION_33_WORD_FIRST_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_33_WORD_FIRST_GOAL,
  introPages: ES_EPISODE_01_SESSION_33_WORD_FIRST_INTRO,
  newVocabulary: ES_EPISODE_01_SESSION_33_VOCABULARY_V1,
  phrases: ES_EPISODE_01_SESSION_33_PHRASES,
});
