import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_EPISODE_01_SESSION_25_PHRASES } from './es_episode_01_session_25_phrases_v1';
import { ES_TRANSPLANTED_S26_PHRASES } from './es_episode_01_transplanted_s26_v1';
import { ES_EPISODE_01_SESSION_27_PHRASES } from './es_episode_01_session_27_phrases_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 31 "Скажи вслух: про нас" / kind: 'voice', builtOn: [25, 26, 27],
// recalls: [25, 26, 27]): voice-сессия не вводит новых слов — переиспользует
// 15 уже утверждённых фраз из сессий 25, 26, 27 (та же стратегия, что и
// сессии 7/15/23: es_episode_01_session_23_phrases_v1.ts). Пул кандидатов —
// 44 уникальные строки (15 в сессии 25, 15 в сессии 26, 14 в сессии 27),
// поэтому дублировать под новыми id, как пришлось в сессии 7 из-за нехватки,
// здесь не требуется.
//
// Отбор смещён к somos (тема "про нас"): 2 фразы из сессии 25 (soy→somos
// recall, ещё простое somos así), 11 фраз из сессии 26 (основной массив
// признаков с полным согласованием по роду и числу — rápidos/rápidas,
// bonitos/bonitas, únicos/únicas, fáciles/difíciles) и 2 диалоговые фразы
// из сессии 27, где somos и son звучат в одной карточке подряд
// (somos-rapidos-son-rapidos-tambien, somos-de-acuerdo-son-de-acuerdo-
// tambien) — ради интонационного контраста двух лиц множественного числа
// при отработке звука вслух, без затрагивания son как отдельного,
// изолированного признака (это уже покрыто сессией 23-соседкой по духу —
// здесь фокус именно на "нас").
//
// ВАЖНО: гейт phrase_duplicate нормализует пунктуацию (снимает ¿/?/,/;)
// перед сравнением — проверено вручную, что ни одна из 15 выбранных строк
// не совпадает с другой после нормализации.
function findPhrase(
  pool: readonly EpisodeSourcePhrase[],
  id: string,
): EpisodeSourcePhrase {
  const found = pool.find((phrase) => phrase.id === id);
  if (!found) throw new Error(`es_session_31_voice_phrase_missing:${id}`);
  return found;
}

const ES_S25 = ES_EPISODE_01_SESSION_25_PHRASES;
// зачем (2026-08-30): сессия 26 удалена владельцем; одиннадцать её somos-фраз
// пересажены байт в байт в transplanted_material.
const ES_S26 = ES_TRANSPLANTED_S26_PHRASES;
const ES_S27 = ES_EPISODE_01_SESSION_27_PHRASES;

export const ES_EPISODE_01_SESSION_31_VOICE_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    findPhrase(ES_S25, 'es-e01-s25-somos-asi'),
    findPhrase(ES_S25, 'es-e01-s25-eres-rapido-somos-asi'),
    findPhrase(ES_S26, 'es-e01-s26-somos-rapidos'),
    findPhrase(ES_S26, 'es-e01-s26-somos-rapidas'),
    findPhrase(ES_S26, 'es-e01-s26-somos-bonitos'),
    findPhrase(ES_S26, 'es-e01-s26-somos-bonitas'),
    findPhrase(ES_S26, 'es-e01-s26-somos-unicos'),
    findPhrase(ES_S26, 'es-e01-s26-somos-unicas'),
    findPhrase(ES_S26, 'es-e01-s26-somos-faciles'),
    findPhrase(ES_S26, 'es-e01-s26-no-somos-dificiles'),
    findPhrase(ES_S26, 'es-e01-s26-somos-unicos-de-acuerdo'),
    findPhrase(ES_S26, 'es-e01-s26-somos-bonitos-verdad-q'),
    findPhrase(ES_S26, 'es-e01-s26-somos-dificiles-igual-q'),
    findPhrase(ES_S27, 'es-e01-s27-somos-rapidos-son-rapidos-tambien'),
    findPhrase(ES_S27, 'es-e01-s27-somos-de-acuerdo-son-de-acuerdo-tambien'),
  ]);
