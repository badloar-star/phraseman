import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_EPISODE_01_SESSION_07_VOICE_PHRASES } from './es_episode_01_session_07_phrases_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 8 "Всё про я целиком" / kind: 'checkpoint', builtOn: [1..7],
// recalls: [1,2,3,4,5]): checkpoint, как и voice, не вводит новых слов
// (kindMayIntroduceVocabulary возвращает false) и требует ровно 15 фраз.
// Пул уникальных фраз, использующих строго word-first словарь сессий 1-6
// (es, soy, fácil, verdad, no, bonito, bonita, verdadero, verdadera, rápido,
// rápida, único, única), уже полностью исчерпан и провалидирован в сессии 7
// (13 существующих + 2 новых No es único/No es única) — checkpoint
// переиспользует РОВНО тот же набор 15 фраз, что и voice: цель контрольной
// точки — проверить владение всем материалом главы 1 целиком, а не
// придумывать ещё материал сверх уже пройденного. Choreography (checkpointSteps
// в lesson1_session_choreography_v1.ts) сама определяет другой набор family
// (speed_match, listen_build_dictation, context_gap_grammar, phrase_builder)
// и другой support/promptNovelty ('master'/'none'/'novel') для тех же фраз —
// это и есть разница между voice и checkpoint на одном материале.
export const ES_EPISODE_01_SESSION_08_CHECKPOINT_PHRASES: readonly EpisodeSourcePhrase[] =
  ES_EPISODE_01_SESSION_07_VOICE_PHRASES;
