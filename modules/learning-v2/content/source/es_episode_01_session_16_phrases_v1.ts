import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_EPISODE_01_SESSION_10_PHRASES } from './es_episode_01_session_10_phrases_v1';
import { ES_EPISODE_01_SESSION_12_PHRASES } from './es_episode_01_session_12_phrases_v1';
import { ES_TRANSPLANTED_S14_PHRASES } from './es_episode_01_transplanted_s14_v1';

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
  // зачем локальная сборка (2026-08-30): сессия 15 удалена владельцем; её
  // пул из 15 вопросительных фраз воссоздаём из живых источников (s10, s12)
  // и пересаженной тройки s14 — состав байт в байт как в voice-15.
  Object.freeze([
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-eres-bonito'),
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-eres-rapida'),
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-eres-unico'),
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-es-facil'),
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-es-dificil'),
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-es-verdad'),
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-es-unico'),
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-soy-verdadero'),
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-soy-rapido'),
    pick(ES_EPISODE_01_SESSION_10_PHRASES, 'es-e01-s10-soy-bonita'),
    pick(ES_EPISODE_01_SESSION_12_PHRASES, 'es-e01-s12-eres-segura'),
    pick(ES_EPISODE_01_SESSION_12_PHRASES, 'es-e01-s12-es-segura'),
    pick(ES_TRANSPLANTED_S14_PHRASES, 'es-e01-s14-eres-de-acuerdo-q'),
    pick(ES_TRANSPLANTED_S14_PHRASES, 'es-e01-s14-es-de-acuerdo-q'),
    pick(ES_TRANSPLANTED_S14_PHRASES, 'es-e01-s14-no-eres-de-acuerdo'),
  ]);

function pick(pool: readonly EpisodeSourcePhrase[], id: string): EpisodeSourcePhrase {
  const found = pool.find((phrase) => phrase.id === id);
  if (!found) throw new Error(`es_session_16_checkpoint_phrase_missing:${id}`);
  return found;
}
