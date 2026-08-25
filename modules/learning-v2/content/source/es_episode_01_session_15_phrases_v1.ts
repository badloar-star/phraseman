import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_EPISODE_01_SESSION_10_PHRASES } from './es_episode_01_session_10_phrases_v1';
import { ES_EPISODE_01_SESSION_12_PHRASES } from './es_episode_01_session_12_phrases_v1';
import { ES_EPISODE_01_SESSION_14_PHRASES } from './es_episode_01_session_14_phrases_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 15 "Скажи вслух: спроси меня" / kind: 'voice', builtOn: [10,12,14],
// recalls: [9,10,14]): voice-сессия не вводит новых слов — переиспользует
// 15 уже утверждённых ВОПРОСИТЕЛЬНЫХ фраз из сессий 10, 12, 14 (та же
// стратегия, что и сессия 7: es_episode_01_session_07_phrases_v1.ts). Пул
// кандидатов — 22 уникальные вопросительные строки (15 в сессии 10, 2 в
// сессии 12, 3 в сессии 14), поэтому дублировать под новыми id, как пришлось
// в сессии 7 из-за нехватки, здесь не требуется — все 15 берутся готовыми.
// Грамматика eres (сессия 9) присутствует во всех "Eres...?"-фразах, значит
// recalls: [9] покрыт без буквального повтора id из сессии 9 (там вопросов
// нет — сессия 9 вводила eres только в утверждениях, вопрос появился в 10).
function findPhrase(
  pool: readonly EpisodeSourcePhrase[],
  id: string,
): EpisodeSourcePhrase {
  const found = pool.find((phrase) => phrase.id === id);
  if (!found) throw new Error(`es_session_15_voice_phrase_missing:${id}`);
  return found;
}

const ES_S10 = ES_EPISODE_01_SESSION_10_PHRASES;
const ES_S12 = ES_EPISODE_01_SESSION_12_PHRASES;
const ES_S14 = ES_EPISODE_01_SESSION_14_PHRASES;

export const ES_EPISODE_01_SESSION_15_VOICE_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    findPhrase(ES_S10, 'es-e01-s10-eres-bonito'),
    findPhrase(ES_S10, 'es-e01-s10-eres-rapida'),
    findPhrase(ES_S10, 'es-e01-s10-eres-unico'),
    findPhrase(ES_S10, 'es-e01-s10-es-facil'),
    findPhrase(ES_S10, 'es-e01-s10-es-dificil'),
    findPhrase(ES_S10, 'es-e01-s10-es-verdad'),
    findPhrase(ES_S10, 'es-e01-s10-es-unico'),
    findPhrase(ES_S10, 'es-e01-s10-soy-verdadero'),
    findPhrase(ES_S10, 'es-e01-s10-soy-rapido'),
    findPhrase(ES_S10, 'es-e01-s10-soy-bonita'),
    findPhrase(ES_S12, 'es-e01-s12-eres-segura'),
    findPhrase(ES_S12, 'es-e01-s12-es-segura'),
    findPhrase(ES_S14, 'es-e01-s14-eres-de-acuerdo-q'),
    findPhrase(ES_S14, 'es-e01-s14-es-de-acuerdo-q'),
    findPhrase(ES_S14, 'es-e01-s14-no-eres-de-acuerdo'),
  ]);
