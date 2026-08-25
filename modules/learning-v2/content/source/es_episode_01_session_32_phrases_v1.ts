import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_EPISODE_01_SESSION_31_VOICE_PHRASES } from './es_episode_01_session_31_phrases_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 32 "Все формы ser целиком" / kind: 'checkpoint', builtOn: [25..31],
// recalls: [1, 9, 17, 25, 27]): checkpoint, как и voice, не вводит новых слов
// (kindMayIntroduceVocabulary возвращает false) и требует ровно тот же набор
// фраз, что и непосредственно предшествующая voice-сессия 31 (см.
// es_episode_01_session_31_phrases_v1.ts) — checkpoint конца главы 4
// переиспользует РОВНО тот же набор 15 фраз, что и voice: цель контрольной
// точки — проверить владение всем материалом главы целиком, а не придумывать
// ещё материал сверх уже пройденного (тот же приём, что и в сессиях 8, 16, 24,
// см. es_episode_01_session_24_phrases_v1.ts). Choreography (checkpointSteps
// в lesson1_session_choreography_v1.ts) сама определяет другой набор family
// (speed_match, listen_build_dictation, context_gap_grammar, phrase_builder)
// и другой support/promptNovelty ('master'/'none'/'novel') для тех же фраз —
// это и есть разница между voice и checkpoint на одном материале.
export const ES_EPISODE_01_SESSION_32_CHECKPOINT_PHRASES: readonly EpisodeSourcePhrase[] =
  ES_EPISODE_01_SESSION_31_VOICE_PHRASES;
