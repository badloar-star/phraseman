import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_23_VOICE_GOAL,
  ES_EPISODE_01_SESSION_23_VOICE_INTRO,
  ES_EPISODE_01_SESSION_23_VOICE_SUMMARY,
  ES_EPISODE_01_SESSION_23_VOICE_TITLE,
} from './es_episode_01_session_23_intro_v1';
import { ES_EPISODE_01_SESSION_23_VOICE_PHRASES } from './es_episode_01_session_23_phrases_v1';
import { ES_EPISODE_01_SESSION_23_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_23_mode_native_v1';
import { LESSON1_ES_SESSION_23_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто» / Глава 3 «Он, она, оно:
 * предметы и ситуации», сессия 23 «Скажи вслух: оцени ситуацию» —
 * собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 23,
 * kind: 'voice', teaches: [], builtOn: [17, 18, 20], recalls: [17, 18, 20].
 *
 * Voice-сессия НЕ вводит новых слов (kindMayIntroduceVocabulary возвращает
 * false для 'voice') — переиспользует 15 уже утверждённых оценочных фраз
 * из сессий 17, 18, 20 (см. es_episode_01_session_23_phrases_v1.ts).
 * distractorAuthorship: 'manual' — дистракторы уже вручную выверены в
 * исходных сессиях, апгрейд не нужен.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-28,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1): легаси generic
 * voiceSteps() в lesson1_session_choreography_v1.ts использует
 * 'sound_contrast' — семью, снятую с активного authoring 2026-08-25
 * (та самая ошибка, которую нашли и закрыли сессии 7 и 15). Разрешение
 * пользователя на эту сессию явно требует явного override — без него мок-
 * сборка достигла бы broken generic voiceSteps(). es_episode_01_session_23_mode_native_v1.ts
 * авторит все 12 practice-шагов (после 3 интро-вопросов) исключительно
 * через утверждённые families (listen_choose/listen_build_dictation/
 * scripted_repeat_compare — НИКОГДА sound_contrast), lesson1SessionChoreographyV1
 * сверяет их против esSession23ModeNativeStepsV1() через
 * LESSON1_ES_SESSION_23_MODE_NATIVE_PLAN_ID_V1.
 */
export const ES_EPISODE_01_SESSION_23_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 23,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-voice-es-e01-s23-v2',
  sessionKindOverride: 'voice',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_23_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_23_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_23_VOICE_TITLE,
  summary: ES_EPISODE_01_SESSION_23_VOICE_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_23_VOICE_GOAL,
  introPages: ES_EPISODE_01_SESSION_23_VOICE_INTRO,
  phrases: ES_EPISODE_01_SESSION_23_VOICE_PHRASES,
});
