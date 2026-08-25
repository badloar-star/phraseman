import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_29_GOAL,
  ES_EPISODE_01_SESSION_29_INTRO,
  ES_EPISODE_01_SESSION_29_SUMMARY,
  ES_EPISODE_01_SESSION_29_TITLE,
} from './es_episode_01_session_29_intro_v1';
import { ES_EPISODE_01_SESSION_29_PHRASES } from './es_episode_01_session_29_phrases_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 29 «Мы не, они не» —
 * собранный источник. Продолжает Главу 4 «Мы и они».
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 29,
 * kind: 'phrases', teaches: ['negation'] (плюс first/third_person_plural
 * как побочный recall), builtOn: [2, 25, 27], recalls: [2, 19].
 *
 * Новых слов нет — 15 фраз завершают всю парадигму отрицания связки ser по
 * лицам: no soy (сессия 2), no eres, no es (сессия 19), а теперь no somos и
 * no son для множественного числа. No встаёт прямо перед связкой, признак
 * после связки не меняется от самого факта отрицания — ни по согласованию,
 * ни по порядку слов.
 *
 * зачем признаки взяты именно из полного согласования по роду И числу
 * (rápidos/rápidas, bonitos/bonitas, únicos/únicas, caros/caras из сессий
 * 3/5/6/18/26/27): это единственный нетронутый участок парадигмы — ни одна
 * прошлая сессия не ставила no перед somos/son именно с этими формами
 * (простые сочетания no + así/de acuerdo/fácil/difícil/dos/tres уже
 * существуют дословно в сессиях 1/14/25/26/27/28, см. комментарий в
 * es_episode_01_session_29_phrases_v1.ts).
 *
 * зачем фразы построены как двойные диалоговые реплики (somos-утверждение
 * vs no son-отрицание и наоборот) вперемешку с самостоятельными
 * no-somos/no-son-фразами: чтобы держать оба лица множественного числа в
 * постоянном контрасте на одной карточке, тот же приём, что и в сессиях
 * 26/27. Второй клоз двойных реплик начинается со строчной буквы после
 * «; » — правило phrase_not_standalone, впервые найденное на сессиях 26/27.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * та же экономия, что и в сессиях 10/14/17/25/26/27/28.
 *
 * зачем sessionKindOverride: 'phrases' ОБЯЗАТЕЛЕН (найдено при аудите
 * сессий 14/17/25): lesson1SessionChoreographyV1 без явного override молча
 * берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же
 * номеру сессии. Испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 29
 * как 'phrases' — override зафиксирован здесь явно с первого черновика,
 * независимо от того, что стоит в английской карте по тому же номеру.
 */
export const ES_EPISODE_01_SESSION_29_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 29,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s29-v1',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_29_TITLE,
  summary: ES_EPISODE_01_SESSION_29_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_29_GOAL,
  introPages: ES_EPISODE_01_SESSION_29_INTRO,
  phrases: ES_EPISODE_01_SESSION_29_PHRASES,
});
