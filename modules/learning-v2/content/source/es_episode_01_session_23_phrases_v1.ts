import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_EPISODE_01_SESSION_17_PHRASES } from './es_episode_01_session_17_phrases_v1';
import { ES_EPISODE_01_SESSION_18_PHRASES } from './es_episode_01_session_18_phrases_v1';
import { ES_EPISODE_01_SESSION_20_PHRASES } from './es_episode_01_session_20_phrases_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 23 "Скажи вслух: оцени ситуацию" / kind: 'voice', builtOn: [17,18,20],
// recalls: [17,18,20]): voice-сессия не вводит новых слов — переиспользует
// 15 уже утверждённых оценочных фраз из сессий 17, 18, 20 (та же стратегия,
// что и сессии 7 и 15: es_episode_01_session_07_phrases_v1.ts,
// es_episode_01_session_15_phrases_v1.ts). Пул кандидатов — 34 уникальные
// строки (15 в сессии 17, 4 в сессии 18, 15 в сессии 20), поэтому дублировать
// под новыми id, как пришлось в сессии 7 из-за нехватки, здесь не требуется.
// Отбор: 11 обычных утвердительных фраз-суждений из сессии 17 (охват разных
// прилагательных, плюс одно отрицание no es fácil), 2 фразы про цену из
// сессии 18 (barato/barata — та же оценочная модель "es + прилагательное"),
// и 2 вопросно-ответные фразы из сессии 20 (¿Es fácil?; es verdad / Sí, es
// verdad) — по образцу сессии 15, где статичные утверждения намеренно
// смешаны с вопросами ради разнообразия интонации при отработке звука вслух.
// ВАЖНО: es-e01-s20-es-verdad-q ("¿Es verdad?") НЕ годится — гейт
// phrase_duplicate нормализует пунктуацию (снимает ¿ и ?), и после этого
// текст совпадает с уже взятой из сессии 17 "Es verdad" (см. normalized() в
// learning_content_quality_gate_v1.ts); поэтому вместо неё взята
// es-e01-s20-es-facil-es-verdad-q ("¿Es fácil?; es verdad") — тоже вопрос,
// но без пересечения по нормализованному тексту с остальными 14 фразами.
function findPhrase(
  pool: readonly EpisodeSourcePhrase[],
  id: string,
): EpisodeSourcePhrase {
  const found = pool.find((phrase) => phrase.id === id);
  if (!found) throw new Error(`es_session_23_voice_phrase_missing:${id}`);
  return found;
}

const ES_S17 = ES_EPISODE_01_SESSION_17_PHRASES;
const ES_S18 = ES_EPISODE_01_SESSION_18_PHRASES;
const ES_S20 = ES_EPISODE_01_SESSION_20_PHRASES;

export const ES_EPISODE_01_SESSION_23_VOICE_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    findPhrase(ES_S17, 'es-e01-s17-es-facil'),
    findPhrase(ES_S17, 'es-e01-s17-es-verdad'),
    findPhrase(ES_S17, 'es-e01-s17-es-asi'),
    findPhrase(ES_S17, 'es-e01-s17-es-igual'),
    findPhrase(ES_S17, 'es-e01-s17-es-importante'),
    findPhrase(ES_S17, 'es-e01-s17-es-caro'),
    findPhrase(ES_S17, 'es-e01-s17-es-bonito'),
    findPhrase(ES_S17, 'es-e01-s17-es-bonita'),
    findPhrase(ES_S17, 'es-e01-s17-es-rapido'),
    findPhrase(ES_S17, 'es-e01-s17-es-unico'),
    findPhrase(ES_S17, 'es-e01-s17-no-es-facil'),
    findPhrase(ES_S18, 'es-e01-s18-es-barato'),
    findPhrase(ES_S18, 'es-e01-s18-es-barata'),
    findPhrase(ES_S20, 'es-e01-s20-es-facil-es-verdad-q'),
    findPhrase(ES_S20, 'es-e01-s20-si-es-verdad'),
  ]);
