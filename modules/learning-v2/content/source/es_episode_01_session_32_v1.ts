import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_32_CHECKPOINT_GOAL,
  ES_EPISODE_01_SESSION_32_CHECKPOINT_INTRO,
  ES_EPISODE_01_SESSION_32_CHECKPOINT_SUMMARY,
  ES_EPISODE_01_SESSION_32_CHECKPOINT_TITLE,
} from './es_episode_01_session_32_intro_v1';
import { ES_EPISODE_01_SESSION_32_CHECKPOINT_PHRASES } from './es_episode_01_session_32_phrases_v1';
import { ES_EPISODE_01_SESSION_32_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_32_mode_native_v1';
import { LESSON1_ES_SESSION_32_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 32 «Все формы ser
 * целиком» — собранный источник. Закрывает Главу 4 «Мы и они».
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 32,
 * kind: 'checkpoint', teaches: [], builtOn: [25,26,27,28,29,30,31],
 * recalls: [1,9,17,25,27].
 *
 * Checkpoint, как и voice, НЕ вводит новых слов — переиспользует ровно тот
 * же набор из 15 уже утверждённых фраз, что и voice-сессия 31 (см.
 * es_episode_01_session_32_phrases_v1.ts). Choreography (checkpointSteps в
 * lesson1_session_choreography_v1.ts) применяет другой набор family
 * (speed_match, listen_build_dictation, context_gap_grammar, phrase_builder)
 * и support:'none'/promptNovelty:'novel' — задание требует применить
 * материал без подсказки, вразнобой, а не повторить его вслух с моделью.
 *
 * ВАЖНО (по правилу владельца, память
 * feedback_checkpoint_intro_no_meta_questions): intro-страницы НЕ являются
 * списком пройденных тем и НЕ задают мета-вопрос про сам процесс проверки.
 * Вместо этого учат ОДНОМУ конкретному языковому факту — самому ценному
 * контрасту главы: somos и son различаются не числом людей, а тем, входит
 * ли говорящий в группу.
 *
 * зачем sessionKindOverride: 'checkpoint' ОБЯЗАТЕЛЕН (найдено при аудите
 * сессий 14/17/25): lesson1SessionChoreographyV1 без явного override молча
 * берёт kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же
 * номеру сессии. Испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 32
 * как 'checkpoint' — override зафиксирован здесь явно с первого черновика.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1, закрывает Главу 4):
 * легаси generic checkpointSteps() в lesson1_session_choreography_v1.ts УЖЕ
 * использует только утверждённые families (speed_match/
 * listen_build_dictation/context_gap_grammar/phrase_builder — sound_contrast
 * там нет), в отличие от voiceSteps(), но mode-native контракт всё равно
 * требует явный авторский план вместо generic геренации: все 12 practice-
 * шагов (после 3 интро-вопросов) авторит es_episode_01_session_32_
 * mode_native_v1.ts с точной mockup-fidelity полезной нагрузкой,
 * lesson1SessionChoreographyV1 сверяет их через
 * LESSON1_ES_SESSION_32_MODE_NATIVE_PLAN_ID_V1. Интро (concept/formula/
 * trap) переписано в том же проходе — легаси-тела трёх страниц были
 * 511-532 знака и 5 предложений (выше потолка 320/4); смысл (единственный
 * вопрос "я в группе?" решает выбор somos/son, а не число людей) сохранён
 * полностью, форма ужата на один экран.
 *
 * КРИТИЧНО (правило владельца, проверка перед написанием сессий 30 и 32):
 * recalls: [1, 9, 17, 25, 27] — эта же связка сессий уже проверена явным
 * grep при написании сессии 30 (rápido/rápida встречается дословно в
 * фразовых файлах сессий 1, 9, 17, 25, 27 — пробела в покрытии не найдено).
 * Пул фраз сессии 32 (тот же набор 15, что и voice-сессия 31, взятый из
 * сессий 25/26/27) ведущим примером несёт rápidos/rápidas — тот же признак,
 * повторно подтверждено здесь тем же методом: пробела в покрытии НЕТ.
 */
export const ES_EPISODE_01_SESSION_32_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 32,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-checkpoint-es-e01-s32-v2',
  sessionKindOverride: 'checkpoint',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_32_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_32_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_32_CHECKPOINT_TITLE,
  summary: ES_EPISODE_01_SESSION_32_CHECKPOINT_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_32_CHECKPOINT_GOAL,
  introPages: ES_EPISODE_01_SESSION_32_CHECKPOINT_INTRO,
  phrases: ES_EPISODE_01_SESSION_32_CHECKPOINT_PHRASES,
});
