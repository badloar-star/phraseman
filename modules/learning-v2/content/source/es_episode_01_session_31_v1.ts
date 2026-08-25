import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_31_VOICE_GOAL,
  ES_EPISODE_01_SESSION_31_VOICE_INTRO,
  ES_EPISODE_01_SESSION_31_VOICE_SUMMARY,
  ES_EPISODE_01_SESSION_31_VOICE_TITLE,
} from './es_episode_01_session_31_intro_v1';
import { ES_EPISODE_01_SESSION_31_VOICE_PHRASES } from './es_episode_01_session_31_phrases_v1';

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
 */
export const ES_EPISODE_01_SESSION_31_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 31,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-voice-es-e01-s31-v1',
  sessionKindOverride: 'voice',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_31_VOICE_TITLE,
  summary: ES_EPISODE_01_SESSION_31_VOICE_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_31_VOICE_GOAL,
  introPages: ES_EPISODE_01_SESSION_31_VOICE_INTRO,
  phrases: ES_EPISODE_01_SESSION_31_VOICE_PHRASES,
});
