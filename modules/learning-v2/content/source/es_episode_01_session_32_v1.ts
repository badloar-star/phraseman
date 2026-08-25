import type { SessionSource } from './session_shard_from_source_v1';
import {
  ES_EPISODE_01_SESSION_32_CHECKPOINT_GOAL,
  ES_EPISODE_01_SESSION_32_CHECKPOINT_INTRO,
  ES_EPISODE_01_SESSION_32_CHECKPOINT_SUMMARY,
  ES_EPISODE_01_SESSION_32_CHECKPOINT_TITLE,
} from './es_episode_01_session_32_intro_v1';
import { ES_EPISODE_01_SESSION_32_CHECKPOINT_PHRASES } from './es_episode_01_session_32_phrases_v1';

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
 */
export const ES_EPISODE_01_SESSION_32_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 32,
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'owner-checkpoint-es-e01-s32-v1',
  sessionKindOverride: 'checkpoint',
  distractorAuthorship: 'manual',
  title: ES_EPISODE_01_SESSION_32_CHECKPOINT_TITLE,
  summary: ES_EPISODE_01_SESSION_32_CHECKPOINT_SUMMARY,
  learningGoal: ES_EPISODE_01_SESSION_32_CHECKPOINT_GOAL,
  introPages: ES_EPISODE_01_SESSION_32_CHECKPOINT_INTRO,
  phrases: ES_EPISODE_01_SESSION_32_CHECKPOINT_PHRASES,
});
