import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_20_GOAL,
  ES_EPISODE_01_SESSION_20_INTRO,
  ES_EPISODE_01_SESSION_20_SUMMARY,
  ES_EPISODE_01_SESSION_20_TITLE,
} from './es_episode_01_session_20_intro_v1';
import { ES_EPISODE_01_SESSION_20_PHRASES } from './es_episode_01_session_20_phrases_v1';
import { ES_EPISODE_01_SESSION_20_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_20_mode_native_v1';
import { LESSON1_ES_SESSION_20_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 20 «Верно ли это?» —
 * собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 20,
 * kind: 'phrases', teaches: [], builtOn: [14, 17], recalls: [14, 17].
 *
 * Синтез двух прежних тем: формула согласия de acuerdo (сессия 14
 * «Согласен или нет») и безличная связка es для предметов и ситуаций
 * (сессия 17 «Это так»). Разница с сессией 14: там de acuerdo звучала как
 * прямой диалог "Ты согласен?"/"Согласен". Здесь фокус — оценка
 * ВЫСКАЗЫВАНИЯ или факта как верного: ¿Es verdad? проверяет истинность
 * заявления, de acuerdo выражает согласие с чужим мнением о нём — это
 * разные проверки одного и того же высказывания (см. интро-страницы).
 *
 * de acuerdo вводится НЕ через newVocabulary (word-first), а прямо во
 * фразах как обычные позиционные токены De/de + acuerdo — тот же путь, что
 * и в сессии 14. Причина: word-first vocabulary в этом курсе поддерживает
 * только ОДНОСЛОВНЫЕ target (подтверждено research-агентом, см. подробный
 * комментарий в es_episode_01_session_14_v1.ts). Впрочем, для этой сессии
 * вопрос решён самим kind: 'phrases' (не words_then_phrases) — newVocabulary
 * здесь не используется в принципе.
 *
 * Новых слов нет — вся лексика уже word-first-одобрена: es/eres/soy,
 * verdad, igual, de acuerdo (сессия 14), fácil/difícil/caro/importante/
 * verdadero (сессия 1), bonito/bonita/segura (сессия 3), único (сессия 6).
 *
 * Без newVocabulary source требует ровно 15 фраз (не 1-15) — все 15
 * написаны. distractorAuthorship: 'manual' снижает минимум дистракторов
 * с 3 до 2.
 *
 * зачем sessionKindOverride: 'phrases' ОБЯЗАТЕЛЕН (владелец, 2026-08-25):
 * lesson1SessionChoreographyV1 без явного override молча берёт kind из
 * АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же номеру сессии.
 * Английская сессия 20 — 'words_then_phrases' («Оно: погода и вещи»),
 * тогда как испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 20 как
 * 'phrases'. Без override мок-сборка молча получала бы неверный набор
 * практических карточек вместо всех 15 написанных фраз — тот же класс
 * бага, что уже ловился в сессиях 14 и 17 (см. их комментарии).
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md): каждый обязательный контакт
 * должен быть реальным действием внутри одной из шести утверждённых
 * механик. es_episode_01_session_20_mode_native_v1.ts авторит все 12
 * practice-шагов (после 3 интро), lesson1SessionChoreographyV1 сверяет их
 * против esSession20ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_20_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_20_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 20,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-word-first-es-e01-s20-v2',
  sessionKindOverride: 'phrases',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_20_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_20_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_20_TITLE,
  summary: ES_EPISODE_01_SESSION_20_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_20_GOAL,
  introPages: ES_EPISODE_01_SESSION_20_INTRO,
  phrases: ES_EPISODE_01_SESSION_20_PHRASES,
});
