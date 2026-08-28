import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_27_GOAL,
  ES_EPISODE_01_SESSION_27_INTRO,
  ES_EPISODE_01_SESSION_27_SUMMARY,
  ES_EPISODE_01_SESSION_27_TITLE,
} from './es_episode_01_session_27_intro_v1';
import { ES_EPISODE_01_SESSION_27_PHRASES } from './es_episode_01_session_27_phrases_v1';
import { ES_EPISODE_01_SESSION_27_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_27_mode_native_v1';
import { LESSON1_ES_SESSION_27_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 27 «Они» —
 * собранный источник. Продолжает Главу 4 «Мы и они».
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 27,
 * kind: 'phrases', teaches: ['third_person_plural'], builtOn: [17, 25],
 * recalls: [17, 25].
 *
 * Новых слов нет — 15 фраз называют son, связку ТРЕТЬЕГО лица
 * МНОЖЕСТВЕННОГО числа: то же лицо, что и es (сессия 17, третье лицо —
 * предметы, ситуации, «он/она»), но теперь о группе, в которую говорящий
 * не входит. Это сдвиг по ЧИСЛУ при неизменном ТРЕТЬЕМ ЛИЦЕ — зеркально
 * сессии 25, где somos сдвигала ЧИСЛО при неизменном ПЕРВОМ лице. Son уже
 * появлялась мимоходом в сессиях 25 и 26 («Son — «они», без говорящего в
 * составе группы» — грамматический дистрактор против somos), эта сессия
 * впервые делает её ГЛАВНЫМ, явным предметом трёх intro-страниц и
 * ПРАВИЛЬНЫМ ответом, по тому же прецеденту, что и сессия 25 с somos
 * (использовалось как дистрактор раньше собственной фокусной сессии).
 *
 * зачем признаки взяты из уже известного набора сессий 1/3/5/6/17/18/26
 * (así, de acuerdo, verdad, importante, fácil/difícil, bonito/…/bonitas,
 * rápido/…/rápidas, único/…/únicas, caro/cara): сессии 25/26 уже построили
 * всю машинерию рода и числа прилагательного при ser — эта сессия учит
 * СДВИГУ ЛИЦА связки, а не новой лексике согласования, поэтому son всегда
 * встаёт перед уже отработанными формами единственного/множественного
 * числа обоих родов.
 *
 * зачем фразы построены как двойные реплики (recall es/somos + son-реакция)
 * вперемешку с самостоятельными son-фразами: чтобы получить 15 РАЗНЫХ фраз
 * без новой лексики, часть фраз продолжает уже известную реплику от
 * третьего лица единственного числа (es, сессия 17) или первого лица
 * множественного (somos, сессия 25) и отвечает / расширяет её формой son,
 * а часть строит son-фразу целиком на уже известных признаках. Somos —
 * главный контрастный дистрактор на позиции связки: оба слова про
 * «несколько», но somos всегда включает говорящего, а son — никогда.
 *
 * distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
 * та же экономия, что и в сессиях 10/14/17/25/26.
 *
 * зачем sessionKindOverride: 'phrases' ОБЯЗАТЕЛЕН (найдено при аудите
 * сессий 14/17/25): lesson1SessionChoreographyV1 без явного override молча
 * берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же
 * номеру сессии. Испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 27
 * как 'phrases' — override зафиксирован здесь явно с первого черновика,
 * независимо от того, что стоит в английской карте по тому же номеру.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт
 * должен быть реальным действием внутри одной из шести утверждённых
 * механик. es_episode_01_session_27_mode_native_v1.ts авторит все 12
 * practice-шагов (после 3 интро), lesson1SessionChoreographyV1 сверяет их
 * против esSession27ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_27_MODE_NATIVE_PLAN_ID_V1. Интро (concept/formula/
 * trap) переписано в том же проходе — легаси-тела трёх страниц были
 * 521-681 знак и 4-6 предложений (выше потолка 320/4); смысл сохранён,
 * форма ужата на один экран.
 */
export const ES_EPISODE_01_SESSION_27_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 27,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s27-v2',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_27_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_27_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_27_TITLE,
  summary: ES_EPISODE_01_SESSION_27_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_27_GOAL,
  introPages: ES_EPISODE_01_SESSION_27_INTRO,
  phrases: ES_EPISODE_01_SESSION_27_PHRASES,
});
