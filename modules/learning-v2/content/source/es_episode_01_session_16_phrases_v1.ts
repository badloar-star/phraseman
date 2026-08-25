import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_EPISODE_01_SESSION_15_VOICE_PHRASES } from './es_episode_01_session_15_phrases_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 16 "Я и ты целиком" / kind: 'checkpoint', builtOn: [9..15],
// recalls: [1,9,10,13,14]): checkpoint, как и voice, не вводит новых слов
// (kindMayIntroduceVocabulary возвращает false) и требует ровно 15 фраз.
// Это контрольная точка конца главы 2 "Ты" — checkpoint переиспользует
// РОВНО тот же набор 15 фраз, что и voice-сессия 15 (все вопросительные
// фразы, покрывающие eres из сессии 9, question_marks/question_intonation
// из сессии 10, pronoun_drop из сессии 13 и agreement_phrase из сессии 14):
// цель контрольной точки — проверить владение всем материалом главы целиком,
// а не придумывать ещё материал сверх уже пройденного (тот же приём, что и
// в сессии 8 для главы 1, см. es_episode_01_session_08_phrases_v1.ts).
// Choreography (checkpointSteps в lesson1_session_choreography_v1.ts) сама
// определяет другой набор family (speed_match, listen_build_dictation,
// context_gap_grammar, phrase_builder) и другой support/promptNovelty
// ('master'/'none'/'novel') для тех же фраз — это и есть разница между
// voice и checkpoint на одном материале.
export const ES_EPISODE_01_SESSION_16_CHECKPOINT_PHRASES: readonly EpisodeSourcePhrase[] =
  ES_EPISODE_01_SESSION_15_VOICE_PHRASES;
