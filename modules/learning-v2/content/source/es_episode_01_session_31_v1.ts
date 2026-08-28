import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_31_VOICE_GOAL,
  ES_EPISODE_01_SESSION_31_VOICE_INTRO,
  ES_EPISODE_01_SESSION_31_VOICE_SUMMARY,
  ES_EPISODE_01_SESSION_31_VOICE_TITLE,
} from './es_episode_01_session_31_intro_v1';
import { ES_EPISODE_01_SESSION_31_VOICE_PHRASES } from './es_episode_01_session_31_phrases_v1';
import { ES_EPISODE_01_SESSION_31_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_31_mode_native_v1';
import { LESSON1_ES_SESSION_31_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 31 «Скажи вслух:
 * про нас» — собранный источник. Завершает Главу 4 «Мы и они» перед
 * checkpoint-сессией 32.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 31,
 * kind: 'voice', teaches: [],
 * builtOn: [25, 26, 27], recalls: [25, 26, 27].
 *
 * Voice-сессия НЕ вводит новых слов (kindMayIntroduceVocabulary возвращает
 * false для 'voice') — переиспользует 15 уже утверждённых фраз из сессий
 * 25, 26, 27 (см. es_episode_01_session_31_phrases_v1.ts). Тема озвучки —
 * произношение somos (первая связка множественного числа в курсе): два
 * слога слитно, без паузы перед признаком.
 * distractorAuthorship: 'manual' — дистракторы уже вручную выверены в
 * исходных сессиях, апгрейд не нужен.
 *
 * зачем sessionKindOverride: 'voice' ОБЯЗАТЕЛЕН (найдено при аудите сессий
 * 14/17/25): lesson1SessionChoreographyV1 без явного override молча берёт
 * kind из АНГЛИЙСКОЙ карты EPISODE_01_SESSION_MAP_V1 по тому же номеру
 * сессии. Испанская карта ES_EPISODE_01_SESSION_MAP_V1 держит 31 как
 * 'voice' — override зафиксирован здесь явно с первого черновика.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1): легаси generic
 * voiceSteps() в lesson1_session_choreography_v1.ts использует
 * 'sound_contrast' — семью, снятую с активного authoring 2026-08-25 (та
 * самая ошибка, которую нашли и закрыли сессии 7/15/23). Разрешение на эту
 * сессию явно требует явного override — без него мок-сборка достигла бы
 * broken generic voiceSteps(). es_episode_01_session_31_mode_native_v1.ts
 * авторит все 12 practice-шагов (после 3 интро-вопросов) исключительно
 * через утверждённые families (listen_choose/listen_build_dictation/
 * scripted_repeat_compare — НИКОГДА sound_contrast),
 * lesson1SessionChoreographyV1 сверяет их против
 * esSession31ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_31_MODE_NATIVE_PLAN_ID_V1. Интро (concept/formula/
 * trap) переписано в том же проходе — легаси-тела трёх страниц были
 * 511-692 знака и 5-8 предложений (выше потолка 320/4); смысл сохранён,
 * форма ужата на один экран.
 */
export const ES_EPISODE_01_SESSION_31_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 31,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-voice-es-e01-s31-v2',
  sessionKindOverride: 'voice',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_31_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_31_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_31_VOICE_TITLE,
  summary: ES_EPISODE_01_SESSION_31_VOICE_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_31_VOICE_GOAL,
  introPages: ES_EPISODE_01_SESSION_31_VOICE_INTRO,
  phrases: ES_EPISODE_01_SESSION_31_VOICE_PHRASES,
});
