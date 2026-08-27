import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_15_VOICE_GOAL,
  ES_EPISODE_01_SESSION_15_VOICE_INTRO,
  ES_EPISODE_01_SESSION_15_VOICE_SUMMARY,
  ES_EPISODE_01_SESSION_15_VOICE_TITLE,
} from './es_episode_01_session_15_intro_v1';
import { ES_EPISODE_01_SESSION_15_VOICE_PHRASES } from './es_episode_01_session_15_phrases_v1';
import { ES_EPISODE_01_SESSION_15_MODE_NATIVE_PRACTICE_V1 } from './es_episode_01_session_15_mode_native_v1';
import { LESSON1_ES_SESSION_15_MODE_NATIVE_PLAN_ID_V1 } from './lesson1_session_choreography_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто» / Глава 2 «Ты: вопрос»,
 * сессия 15 «Скажи вслух: спроси меня» — собранный источник.
 *
 * Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 15,
 * kind: 'voice', teaches: [], builtOn: [10, 12, 14], recalls: [9, 10, 14].
 *
 * Voice-сессия НЕ вводит новых слов (kindMayIntroduceVocabulary возвращает
 * false для 'voice') — переиспользует 15 уже утверждённых вопросительных
 * фраз из сессий 10, 12, 14 (см. es_episode_01_session_15_phrases_v1.ts).
 * distractorAuthorship: 'manual' — дистракторы уже вручную выверены в
 * исходных сессиях, апгрейд не нужен.
 *
 * зачем modeNativePlanId/modeNativePractice (владелец, 2026-08-27,
 * MODE_NATIVE_AUTHORING_CONTRACT.ru.md + Rules §4.1): легаси generic
 * voiceSteps() в lesson1_session_choreography_v1.ts использует
 * 'sound_contrast' — семью, снятую с активного authoring 2026-08-25
 * (та самая ошибка, которую нашла и закрыла сессия 7 для сессий 1-6).
 * es_episode_01_session_15_mode_native_v1.ts авторит все 12 practice-шагов
 * (после 3 интро-вопросов) исключительно через утверждённые families,
 * lesson1SessionChoreographyV1 сверяет их против esSession15ModeNativeStepsV1()
 * через LESSON1_ES_SESSION_15_MODE_NATIVE_PLAN_ID_V1 — этот явный override
 * гарантирует, что broken generic voiceSteps() никогда не достигается для
 * этой сессии.
 */
export const ES_EPISODE_01_SESSION_15_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 15,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-voice-es-e01-s15-v1',
  sessionKindOverride: 'voice',
  distractorAuthorship: 'manual',
  modeNativePlanId: LESSON1_ES_SESSION_15_MODE_NATIVE_PLAN_ID_V1,
  modeNativePractice: ES_EPISODE_01_SESSION_15_MODE_NATIVE_PRACTICE_V1,
  title: ES_EPISODE_01_SESSION_15_VOICE_TITLE,
  summary: ES_EPISODE_01_SESSION_15_VOICE_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_15_VOICE_GOAL,
  introPages: ES_EPISODE_01_SESSION_15_VOICE_INTRO,
  phrases: ES_EPISODE_01_SESSION_15_VOICE_PHRASES,
});
