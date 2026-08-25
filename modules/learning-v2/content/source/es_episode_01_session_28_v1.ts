import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_28_GOAL,
  ES_EPISODE_01_SESSION_28_INTRO,
  ES_EPISODE_01_SESSION_28_SUMMARY,
  ES_EPISODE_01_SESSION_28_TITLE,
} from './es_episode_01_session_28_intro_v1';
import { ES_EPISODE_01_SESSION_28_PHRASES } from './es_episode_01_session_28_phrases_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 28 «Вдвоём: somos
 * dos» — собранный источник. Продолжает Главу 4 «Мы и они».
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 28,
 * kind: 'phrases', teaches: ['number_with_ser'], builtOn: [9, 27],
 * recalls: [9, 27].
 *
 * Новых слов формально нет — 15 фраз учат ставить числительное сразу после
 * уже знакомой связки ser, чтобы назвать точный размер группы: Somos dos
 * (сессия 25 somos + число), Son tres (сессия 27 son + число). Два
 * числительных (dos, tres) введены как обычные позиционные токены words[] —
 * тем же способом, каким раньше вводились артикли и союзы (o/y), без
 * формального word-first экрана, но с собственными дистракторами на каждой
 * позиции. Проверено вручную (grep по всем испанским session-файлам):
 * числительные нигде раньше в курсе не встречались как испанский текст
 * фразы.
 *
 * зачем только dos и tres, а не весь ряд 1-10: kind: 'phrases' запрещает
 * newVocabulary. Полный числовой ряд — самостоятельная лексическая тема
 * достаточного размера для отдельной будущей сессии (см. sessionOrdinal 41
 * "Сколько нас" / ser_quantity в карте — уже word_then_phrases и явно про
 * количество); здесь фокус на САМОЙ КОНСТРУКЦИИ ser+число, а не на
 * запоминании всех цифр. Двух чисел достаточно, чтобы показать общий
 * паттерн и дать содержательный контраст на позиции дистрактора (dos против
 * tres и наоборот), не перегружая нелексическую сессию новой лексикой.
 *
 * зачем eres/es никогда не сочетаются с числом: "Eres dos" грамматически
 * бессмысленно в испанском — один собеседник не может быть "два" человека.
 * Естественный счёт группы существует только через somos (говорящий в
 * группе) и son (говорящий вне группы). Eres (сессия 9) и son (сессия 27)
 * остаются в игре как RECALL-контраст на позиции связки (грамматические
 * дистракторы и элементы диалоговых фраз), но никогда как "eres/es + число".
 *
 * зачем диалоговые фразы (recall eres/son + somos-ответ): чтобы получить 15
 * РАЗНЫХ фраз без новой грамматики, часть фраз — самостоятельные somos/son +
 * число, часть — короткие двухреплийные диалоги, где первая реплика recall'ит
 * eres (сессия 9) или son (сессия 27), а вторая называет размер группы.
 * Второй клоз всегда начинается со строчной буквы после "; " (правило
 * phrase_not_standalone, найденное на сессиях 26/27).
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * та же экономия, что и в сессиях 10/14/17/25/26/27.
 *
 * зачем sessionKindOverride: 'phrases' ОБЯЗАТЕЛЕН (найдено при аудите
 * сессий 14/17/25/27): lesson1SessionChoreographyV1 без явного override
 * молча берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же
 * номеру сессии. Испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 28 как
 * 'phrases' — override зафиксирован здесь явно с первого черновика,
 * независимо от того, что стоит в английской карте по тому же номеру.
 */
export const ES_EPISODE_01_SESSION_28_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 28,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s28-v1',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_28_TITLE,
  summary: ES_EPISODE_01_SESSION_28_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_28_GOAL,
  introPages: ES_EPISODE_01_SESSION_28_INTRO,
  phrases: ES_EPISODE_01_SESSION_28_PHRASES,
});
